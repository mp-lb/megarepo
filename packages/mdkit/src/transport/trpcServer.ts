import { initTRPC } from "@trpc/server";
import { z } from "zod";
import type { MdKitTransportStore } from "./store";

const t = initTRPC.create();

const documentInput = z.object({
  documentId: z.string(),
});

const versionInput = z.object({
  documentId: z.string(),
  versionId: z.string(),
});

const versionToken = z.union([z.string(), z.number()]).nullable();

const writeInput = z.object({
  baseVersion: versionToken,
  content: z.string(),
  documentId: z.string(),
  force: z.boolean().optional(),
});

export const createMdKitTrpcRouter = (store: MdKitTransportStore) =>
  t.router({
    listDocumentVersions: t.procedure
      .input(documentInput)
      .query(async ({ input }) => ({
        versions: await (store.listDocumentVersions?.(input.documentId) ?? []),
      })),
    readDocument: t.procedure
      .input(documentInput)
      .query(({ input }) => store.readDocument(input.documentId)),
    readDocumentVersion: t.procedure.input(versionInput).query(
      ({ input }) =>
        store.readDocumentVersion?.({
          documentId: input.documentId,
          versionId: input.versionId,
        }) ?? null,
    ),
    resyncDocument: t.procedure
      .input(documentInput)
      .mutation(({ input }) =>
        (store.resyncDocument ?? store.readDocument)(input.documentId),
      ),
    restoreDocumentVersion: t.procedure
      .input(versionInput)
      .mutation(({ input }) => {
        if (!store.restoreDocumentVersion) {
          throw new Error("Version restore is not supported");
        }

        return store.restoreDocumentVersion(input);
      }),
    writeDocument: t.procedure
      .input(writeInput)
      .mutation(({ input }) => store.writeDocument(input)),
  });

export type MdKitTrpcRouter = ReturnType<typeof createMdKitTrpcRouter>;
