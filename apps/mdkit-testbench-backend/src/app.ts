import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { Database } from "@hocuspocus/extension-database";
import { Server } from "@hocuspocus/server";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { initTRPC } from "@trpc/server";
import Fastify from "fastify";
import { CheckpointPolicy } from "@mp-lb/mdkit/core";
import { createMdKitBackend } from "@mp-lb/mdkit/server";
import { registerMdKitFastify } from "@mp-lb/mdkit/fastify";
import { createMdKitTrpcRouter } from "@mp-lb/mdkit/trpc/server";
import { z } from "zod";
import { createMemoryStore, type MdKitTestbenchStore } from "./memoryStore.js";
import type { MdKitTransportStore } from "@mp-lb/mdkit/fastify";

export type TestbenchStackId =
  | "checkpoints"
  | "collaboration"
  | "full"
  | "storage";

export type MdKitTestbenchAppOptions = {
  logger?: boolean;
  store?: MdKitTestbenchStore;
};

const documentQuerySchema = z.object({
  documentId: z.string(),
  stack: z
    .enum(["checkpoints", "collaboration", "full", "storage"])
    .optional(),
});

const remoteChangeSchema = z.object({
  content: z.string().optional(),
});

const t = initTRPC.create();

type TestbenchStack = {
  collaboration: ReturnType<typeof Server.configure> | null;
  hasCheckpoints: boolean;
  hasCollaboration: boolean;
  mdkit: MdKitTransportStore;
  store: MdKitTestbenchStore;
};

type TestbenchStacks = Record<TestbenchStackId, TestbenchStack>;

const createTestbenchTrpcRouter = (stacks: TestbenchStacks) =>
  t.router({
    checkpoints: createMdKitTrpcRouter(stacks.checkpoints.mdkit),
    collaboration: createMdKitTrpcRouter(stacks.collaboration.mdkit),
    full: createMdKitTrpcRouter(stacks.full.mdkit),
    mdkit: createMdKitTrpcRouter(stacks.full.mdkit),
    storage: createMdKitTrpcRouter(stacks.storage.mdkit),
  });

export type AppRouter = ReturnType<typeof createTestbenchTrpcRouter>;

const createTestbenchStack = ({
  hasCheckpoints,
  hasCollaboration,
  store,
}: {
  hasCheckpoints: boolean;
  hasCollaboration: boolean;
  store: MdKitTestbenchStore;
}): TestbenchStack => {
  const mdkitStore = {
    ...(hasCheckpoints
      ? {
          createCheckpoint: store.createCheckpoint,
          getLatestCheckpoint: store.getLatestCheckpoint,
          listDocumentVersions: store.listDocumentVersions,
          readDocumentVersion: ({ documentId, versionId }) =>
            store.readDocumentVersion(documentId, versionId),
        }
      : {}),
    ...(hasCollaboration
      ? {
          readCollaborationState: store.readCollaborationState,
          writeCollaborationState: store.writeCollaborationState,
        }
      : {}),
    readDocument: store.readDocument,
    resyncDocument: store.readDocument,
    writeDocument: store.writeDocument,
  } satisfies Parameters<typeof createMdKitBackend>[0]["store"];

  const mdkit = createMdKitBackend({
    checkpointPolicy: hasCheckpoints
      ? CheckpointPolicy.smart()
      : CheckpointPolicy.never(),
    store: mdkitStore,
  });

  const collaboration = hasCollaboration
    ? Server.configure({
        extensions: [
          new Database({
            fetch: async ({ documentName }) =>
              mdkit.readCollaborationState?.(documentName) ?? null,
            store: async ({ documentName, state }) => {
              await mdkit.writeCollaborationState?.(documentName, state);
            },
          }),
        ],
      })
    : null;

  return {
    collaboration,
    hasCheckpoints,
    hasCollaboration,
    mdkit,
    store,
  };
};

export const createTestbenchApp = async (
  options: MdKitTestbenchAppOptions = {},
) => {
  const stacks: TestbenchStacks = {
    checkpoints: createTestbenchStack({
      hasCheckpoints: true,
      hasCollaboration: false,
      store: createMemoryStore(),
    }),
    collaboration: createTestbenchStack({
      hasCheckpoints: false,
      hasCollaboration: true,
      store: createMemoryStore(),
    }),
    full: createTestbenchStack({
      hasCheckpoints: true,
      hasCollaboration: true,
      store: options.store ?? createMemoryStore(),
    }),
    storage: createTestbenchStack({
      hasCheckpoints: false,
      hasCollaboration: false,
      store: createMemoryStore(),
    }),
  };

  const app = Fastify({
    logger: options.logger ?? false,
  });

  await app.register(cors, {
    origin: true,
  });

  await app.register(websocket);

  app.get("/health", async () => ({
    ok: true,
  }));

  await registerMdKitFastify(app, {
    store: stacks.full.mdkit,
  });

  await app.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: createTestbenchTrpcRouter(stacks),
    },
  });

  app.post("/test/reset", async () => {
    Object.values(stacks).forEach((stack) => stack.store.clear());
    return { ok: true };
  });

  app.post("/test/remote-change", async (request) => {
    const { documentId, stack = "full" } = documentQuerySchema.parse(
      request.query,
    );
    const body = remoteChangeSchema.parse(request.body ?? {});
    const targetStack = stacks[stack];
    const current = targetStack.store.readDocument(documentId);

    return targetStack.store.writeDocument({
      baseVersion: current.version,
      content:
        body.content ??
        `${current.content}\n\nRemote change ${new Date().toLocaleTimeString()}`,
      documentId,
    });
  });

  app.get("/collaboration/:stack", { websocket: true }, (socket, request) => {
    const stack = z
      .enum(["collaboration", "full"])
      .parse((request.params as { stack?: string }).stack);

    stacks[stack].collaboration?.handleConnection(socket, request.raw, {});
  });

  app.addHook("onClose", async () => {
    await Promise.all(
      Object.values(stacks).map((stack) => stack.collaboration?.destroy()),
    );
  });

  return {
    app,
    stackStores: Object.fromEntries(
      Object.entries(stacks).map(([stack, value]) => [stack, value.store]),
    ) as Record<TestbenchStackId, MdKitTestbenchStore>,
    store: stacks.full.store,
  };
};
