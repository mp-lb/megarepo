import type {
  MdKitDocumentSnapshot,
  MdKitDocumentVersionDetail,
  MdKitDocumentVersionToken,
  MdKitDocumentWriteResult,
} from "../document/documentTypes.js";

export type MdKitDocumentRecord = {
  current: MdKitDocumentSnapshot;
  versions: MdKitDocumentVersionDetail[];
};

export type CreateMdKitDocumentRecordInput = {
  content?: string;
  now?: string;
};

export type WriteMdKitDocumentRecordInput = {
  baseVersion: MdKitDocumentVersionToken;
  content: string;
  force?: boolean;
  label?: string;
  now?: string;
};

export type WriteMdKitDocumentRecordResult = {
  record: MdKitDocumentRecord;
  result: MdKitDocumentWriteResult;
};

export type RestoreMdKitDocumentVersionInput = {
  label?: string;
  now?: string;
  versionId: string;
};

export type RestoreMdKitDocumentVersionResult = {
  record: MdKitDocumentRecord;
  restoredVersion: MdKitDocumentVersionDetail;
  result: MdKitDocumentWriteResult;
};

const initialVersion = "0";

const createTimestamp = () => new Date().toISOString();

export const normalizeMdKitVersionToken = (
  version: MdKitDocumentVersionToken | undefined,
) => (version == null ? null : String(version));

export const detectMdKitDocumentConflict = (input: {
  baseVersion: MdKitDocumentVersionToken;
  currentVersion: MdKitDocumentVersionToken;
}) =>
  normalizeMdKitVersionToken(input.baseVersion) !==
  normalizeMdKitVersionToken(input.currentVersion);

const nextVersionToken = (currentVersion: MdKitDocumentVersionToken) => {
  const current = Number(normalizeMdKitVersionToken(currentVersion));

  return Number.isFinite(current) ? String(current + 1) : createTimestamp();
};

const createVersionDetail = (input: {
  content: string;
  id: string;
  label?: string;
  now: string;
}): MdKitDocumentVersionDetail => ({
  content: input.content,
  createdAt: input.now,
  id: input.id,
  label: input.label,
  updatedAt: input.now,
  version: input.id,
});

export const createMdKitDocumentRecord = (
  input: CreateMdKitDocumentRecordInput = {},
): MdKitDocumentRecord => {
  const now = input.now ?? createTimestamp();
  const content = input.content ?? "";
  const current = {
    content,
    updatedAt: now,
    version: initialVersion,
  };

  return {
    current,
    versions: [
      createVersionDetail({
        content,
        id: initialVersion,
        label: "Initial",
        now,
      }),
    ],
  };
};

export const writeMdKitDocumentRecord = (
  record: MdKitDocumentRecord,
  input: WriteMdKitDocumentRecordInput,
): WriteMdKitDocumentRecordResult => {
  if (
    !input.force &&
    detectMdKitDocumentConflict({
      baseVersion: input.baseVersion,
      currentVersion: record.current.version,
    })
  ) {
    return {
      record,
      result: {
        conflict: true,
        updatedAt: record.current.updatedAt,
        version: record.current.version,
      },
    };
  }

  const now = input.now ?? createTimestamp();
  const version = nextVersionToken(record.current.version);
  const current = {
    content: input.content,
    updatedAt: now,
    version,
  };

  return {
    record: {
      current,
      versions: [
        ...record.versions,
        createVersionDetail({
          content: input.content,
          id: version,
          label: input.label ?? `Version ${version}`,
          now,
        }),
      ],
    },
    result: {
      updatedAt: now,
      version,
    },
  };
};

export const restoreMdKitDocumentVersion = (
  record: MdKitDocumentRecord,
  input: RestoreMdKitDocumentVersionInput,
): RestoreMdKitDocumentVersionResult => {
  const restoredVersion = record.versions.find(
    (version) => version.id === input.versionId,
  );

  if (!restoredVersion) {
    throw new Error(`Version not found: ${input.versionId}`);
  }

  const written = writeMdKitDocumentRecord(record, {
    baseVersion: record.current.version,
    content: restoredVersion.content,
    force: true,
    label: input.label ?? `Restore ${restoredVersion.id}`,
    now: input.now,
  });

  return {
    ...written,
    restoredVersion,
  };
};
