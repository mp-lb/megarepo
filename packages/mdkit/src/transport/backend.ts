import type {
  MdKitDocumentSnapshot,
  MdKitDocumentVersionDetail,
  MdKitDocumentVersionSummary,
  MdKitDocumentVersionToken,
  MdKitDocumentWriteInput,
  MdKitDocumentWriteResult,
} from "../document/documentTypes";
import {
  CheckpointPolicy,
  measureMdKitEditDistance,
  type MdKitCheckpointPolicy,
} from "../core/checkpointPolicy";
import type {
  MdKitRestoreDocumentVersionInput,
  MdKitTransportStore,
} from "./store";

export type MdKitCreateCheckpointInput = {
  content: string;
  documentId: string;
  metadata?: unknown;
  sourceRevision: MdKitDocumentVersionToken;
};

export type MdKitBackendStore = {
  createCheckpoint?(
    input: MdKitCreateCheckpointInput,
  ): Promise<MdKitDocumentVersionSummary> | MdKitDocumentVersionSummary;
  getLatestCheckpoint?(
    documentId: string,
  ): Promise<MdKitDocumentVersionDetail | null> | MdKitDocumentVersionDetail | null;
  listDocumentVersions?(
    documentId: string,
  ): Promise<MdKitDocumentVersionSummary[]> | MdKitDocumentVersionSummary[];
  readCollaborationState?(
    documentName: string,
  ): Promise<Uint8Array | null> | Uint8Array | null;
  readDocument(
    documentId: string,
  ): Promise<MdKitDocumentSnapshot> | MdKitDocumentSnapshot;
  readDocumentVersion?(input: {
    documentId: string;
    versionId: string;
  }):
    | Promise<MdKitDocumentVersionDetail | null>
    | MdKitDocumentVersionDetail
    | null;
  resyncDocument?(
    documentId: string,
  ): Promise<MdKitDocumentSnapshot> | MdKitDocumentSnapshot;
  restoreDocumentVersion?(
    input: MdKitRestoreDocumentVersionInput,
  ): Promise<MdKitDocumentWriteResult> | MdKitDocumentWriteResult;
  writeCollaborationState?(
    documentName: string,
    state: Uint8Array,
  ): Promise<void> | void;
  writeDocument(
    input: MdKitDocumentWriteInput,
  ): Promise<MdKitDocumentWriteResult> | MdKitDocumentWriteResult;
};

export type CreateMdKitBackendOptions = {
  checkpointPolicy?: MdKitCheckpointPolicy;
  store: MdKitBackendStore;
};

const timestampMs = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const successfulWriteRevision = (result: MdKitDocumentWriteResult) =>
  "conflict" in result ? null : result.version;

const latestCheckpointFromList = async (
  store: MdKitBackendStore,
  documentId: string,
) => {
  const versions = await store.listDocumentVersions?.(documentId);
  const latestSummary = versions?.at(-1);

  if (!latestSummary || !store.readDocumentVersion) {
    return null;
  }

  return store.readDocumentVersion({
    documentId,
    versionId: latestSummary.id,
  });
};

const readLatestCheckpoint = async (
  store: MdKitBackendStore,
  documentId: string,
) =>
  (await store.getLatestCheckpoint?.(documentId)) ??
  (await latestCheckpointFromList(store, documentId));

const maybeCreateCheckpoint = async (
  store: MdKitBackendStore,
  policy: MdKitCheckpointPolicy,
  input: MdKitDocumentWriteInput,
  result: MdKitDocumentWriteResult,
) => {
  const sourceRevision = successfulWriteRevision(result);

  if (!store.createCheckpoint || sourceRevision === null) {
    return;
  }

  const previousCheckpoint = await readLatestCheckpoint(store, input.documentId);
  const previousCheckpointContent = previousCheckpoint?.content ?? null;
  const editDistance = measureMdKitEditDistance(
    previousCheckpointContent ?? "",
    input.content,
  );
  const checkpointTimestamp = timestampMs(previousCheckpoint?.createdAt);
  const timeSinceLastCheckpointMs =
    checkpointTimestamp === null ? null : Date.now() - checkpointTimestamp;
  const shouldCheckpoint = await policy.shouldCheckpoint({
    currentContent: input.content,
    documentId: input.documentId,
    editDistance,
    previousCheckpoint,
    previousCheckpointContent,
    timeSinceLastCheckpointMs,
    writeInput: input,
    writeResult: result,
  });

  if (!shouldCheckpoint) {
    return;
  }

  await store.createCheckpoint({
    content: input.content,
    documentId: input.documentId,
    sourceRevision,
  });
};

const restoreWithStorePrimitives = async (
  store: MdKitBackendStore,
  input: MdKitRestoreDocumentVersionInput,
) => {
  if (!store.readDocumentVersion) {
    if (!store.restoreDocumentVersion) {
      throw new Error("Version restore is not supported");
    }

    return store.restoreDocumentVersion(input);
  }

  const restoredVersion = await store.readDocumentVersion(input);

  if (!restoredVersion) {
    throw new Error(`Version not found: ${input.versionId}`);
  }

  const current = await store.readDocument(input.documentId);
  const latestCheckpoint = await readLatestCheckpoint(store, input.documentId);

  if (
    store.createCheckpoint &&
    latestCheckpoint?.content !== current.content
  ) {
    await store.createCheckpoint({
      content: current.content,
      documentId: input.documentId,
      sourceRevision: current.version,
    });
  }

  return store.writeDocument({
    baseVersion: current.version,
    content: restoredVersion.content,
    documentId: input.documentId,
    force: true,
  });
};

export const createMdKitBackend = ({
  checkpointPolicy = CheckpointPolicy.never(),
  store,
}: CreateMdKitBackendOptions): MdKitTransportStore => ({
  listDocumentVersions: (documentId) =>
    store.listDocumentVersions?.(documentId) ?? [],
  readCollaborationState: (documentName) =>
    store.readCollaborationState?.(documentName) ?? null,
  readDocument: (documentId) => store.readDocument(documentId),
  readDocumentVersion: (input) => store.readDocumentVersion?.(input) ?? null,
  resyncDocument: (documentId) =>
    (store.resyncDocument ?? store.readDocument)(documentId),
  restoreDocumentVersion: (input) => restoreWithStorePrimitives(store, input),
  writeCollaborationState: (documentName, state) =>
    store.writeCollaborationState?.(documentName, state),
  writeDocument: async (input) => {
    const result = await store.writeDocument(input);
    await maybeCreateCheckpoint(store, checkpointPolicy, input, result);
    return result;
  },
});
