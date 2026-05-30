import {
  createMdKitDocumentRecord,
  detectMdKitDocumentConflict,
  type MdKitDocumentRecord,
  type MdKitDocumentSnapshot,
  type MdKitDocumentVersionDetail,
  type MdKitDocumentVersionSummary,
  type MdKitDocumentVersionToken,
  type MdKitDocumentWriteInput,
} from "@mp-lb/mdkit/core";

export type MdKitTestbenchStore = ReturnType<typeof createMemoryStore>;
type TestbenchWriteDocumentInput = MdKitDocumentWriteInput & {
  force?: boolean;
};

export const createMemoryStore = () => {
  const records = new Map<string, MdKitDocumentRecord>();
  const collaborationStates = new Map<string, Uint8Array>();

  const readRecord = (documentId: string) => {
    const existing = records.get(documentId);

    if (existing) {
      return existing;
    }

    const created = createMdKitDocumentRecord();
    records.set(documentId, created);
    return created;
  };

  const readDocument = (documentId: string) => readRecord(documentId).current;

  const nextVersionToken = (currentVersion: MdKitDocumentVersionToken) => {
    const current = Number(currentVersion);
    return Number.isFinite(current) ? String(current + 1) : String(Date.now());
  };

  const writeDocument = (input: TestbenchWriteDocumentInput) => {
    const record = readRecord(input.documentId);

    if (
      !input.force &&
      detectMdKitDocumentConflict({
        baseVersion: input.baseVersion,
        currentVersion: record.current.version,
      })
    ) {
      return {
        conflict: true as const,
        updatedAt: record.current.updatedAt,
        version: record.current.version,
      };
    }

    const now = new Date().toISOString();
    const current: MdKitDocumentSnapshot = {
      content: input.content,
      updatedAt: now,
      version: nextVersionToken(record.current.version),
    };

    records.set(input.documentId, {
      ...record,
      current,
    });

    return {
      updatedAt: current.updatedAt,
      version: current.version,
    };
  };

  const createCheckpoint = (input: {
    content: string;
    documentId: string;
    sourceRevision: MdKitDocumentVersionToken;
  }): MdKitDocumentVersionSummary => {
    const record = readRecord(input.documentId);
    const now = new Date().toISOString();
    const checkpoint: MdKitDocumentVersionDetail = {
      content: input.content,
      createdAt: now,
      id: String(input.sourceRevision),
      label: `Version ${input.sourceRevision}`,
      updatedAt: now,
      version: input.sourceRevision,
    };

    records.set(input.documentId, {
      ...record,
      versions: [...record.versions, checkpoint],
    });

    return checkpoint;
  };

  const listDocumentVersions = (documentId: string) =>
    readRecord(documentId).versions.map(
      ({ authorLabel, createdAt, id, label, updatedAt, version }) => ({
        authorLabel: authorLabel ?? null,
        createdAt,
        id,
        label,
        updatedAt,
        version,
      }),
    );

  const readDocumentVersion = (documentId: string, versionId: string) =>
    readRecord(documentId).versions.find((version) => version.id === versionId) ??
    null;

  return {
    clear: () => {
      records.clear();
      collaborationStates.clear();
    },
    createCheckpoint,
    getLatestCheckpoint: (documentId: string) =>
      readRecord(documentId).versions.at(-1) ?? null,
    listDocumentVersions,
    readCollaborationState: (documentId: string) =>
      collaborationStates.get(documentId) ?? null,
    readDocument,
    readDocumentVersion,
    writeCollaborationState: (documentId: string, state: Uint8Array) => {
      collaborationStates.set(documentId, state);
    },
    writeDocument,
  };
};
