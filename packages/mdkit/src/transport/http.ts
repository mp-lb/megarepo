import type {
  MdKitDocumentVersionToken,
  MdKitDocumentWriteInput,
} from "../document/documentTypes";
import type {
  MdKitRestoreDocumentVersionInput,
  MdKitTransportStore,
} from "./store";

export type MdKitHttpRequest = {
  body?: unknown;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
};

export type MdKitHttpResponse<T = unknown> = {
  body: T;
  status: number;
};

export type MdKitHttpHandlers = ReturnType<typeof createMdKitHttpHandlers>;

const readString = (
  source: Record<string, unknown> | undefined,
  key: string,
): string => {
  const value = source?.[key];

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing mdkit ${key}`);
  }

  return value;
};

const readVersionToken = (value: unknown): MdKitDocumentVersionToken => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return value;
  }

  throw new Error("Invalid mdkit baseVersion");
};

const readWriteInput = (request: MdKitHttpRequest): MdKitDocumentWriteInput => {
  const body = request.body as Record<string, unknown> | null | undefined;

  if (!body || typeof body !== "object") {
    throw new Error("Missing mdkit write body");
  }

  const content = body.content;

  if (typeof content !== "string") {
    throw new Error("Invalid mdkit content");
  }

  return {
    baseVersion: readVersionToken(body.baseVersion),
    content,
    documentId: readString(request.query, "documentId"),
    force: body.force === true,
  };
};

const notFound = (message: string): MdKitHttpResponse<{ error: string }> => ({
  body: { error: message },
  status: 404,
});

export const createMdKitHttpHandlers = (store: MdKitTransportStore) => ({
  readDocument: async (request: MdKitHttpRequest) => ({
    body: await store.readDocument(readString(request.query, "documentId")),
    status: 200,
  }),
  writeDocument: async (request: MdKitHttpRequest) => {
    const body = await store.writeDocument(readWriteInput(request));

    return {
      body,
      status: "conflict" in body ? 409 : 200,
    };
  },
  resyncDocument: async (request: MdKitHttpRequest) => ({
    body: await (store.resyncDocument ?? store.readDocument)(
      readString(request.query, "documentId"),
    ),
    status: 200,
  }),
  listDocumentVersions: async (request: MdKitHttpRequest) => ({
    body: {
      versions: await (store.listDocumentVersions?.(
        readString(request.query, "documentId"),
      ) ?? []),
    },
    status: 200,
  }),
  readDocumentVersion: async (request: MdKitHttpRequest) => {
    const version = await store.readDocumentVersion?.({
      documentId: readString(request.query, "documentId"),
      versionId: readString(request.params, "versionId"),
    });

    return version
      ? ({ body: version, status: 200 } as const)
      : notFound("Version not found");
  },
  restoreDocumentVersion: async (request: MdKitHttpRequest) => {
    if (!store.restoreDocumentVersion) {
      return notFound("Version restore is not supported");
    }

    const input: MdKitRestoreDocumentVersionInput = {
      documentId: readString(request.query, "documentId"),
      versionId: readString(request.params, "versionId"),
    };

    return {
      body: await store.restoreDocumentVersion(input),
      status: 200,
    };
  },
});
