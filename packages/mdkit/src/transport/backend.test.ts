import { describe, expect, it, vi } from "vitest";
import { CheckpointPolicy } from "../core/checkpointPolicy";
import type {
  MdKitDocumentSnapshot,
  MdKitDocumentVersionDetail,
  MdKitDocumentVersionSummary,
  MdKitDocumentWriteInput,
} from "../document/documentTypes";
import { createMdKitBackend, type MdKitBackendStore } from "./backend";

const createStore = (input: {
  current?: MdKitDocumentSnapshot;
  checkpoints?: MdKitDocumentVersionDetail[];
} = {}) => {
  let current: MdKitDocumentSnapshot =
    input.current ??
    {
      content: "initial",
      updatedAt: "2026-04-30T12:00:00.000Z",
      version: "0",
    };
  const checkpoints = [...(input.checkpoints ?? [])];
  const createCheckpoint = vi.fn(
    ({
      content,
      sourceRevision,
    }: {
      content: string;
      sourceRevision: string | number | null;
    }): MdKitDocumentVersionSummary => {
      const id = `checkpoint-${checkpoints.length + 1}`;
      const checkpoint = {
        content,
        createdAt: "2026-04-30T12:05:00.000Z",
        id,
        version: sourceRevision,
      };

      checkpoints.push(checkpoint);

      return checkpoint;
    },
  );
  const writeDocument = vi.fn((write: MdKitDocumentWriteInput) => {
    if (!write.force && write.baseVersion !== current.version) {
      return {
        conflict: true as const,
        updatedAt: current.updatedAt,
        version: current.version,
      };
    }

    current = {
      content: write.content,
      updatedAt: "2026-04-30T12:10:00.000Z",
      version: String(Number(current.version) + 1),
    };

    return {
      updatedAt: current.updatedAt,
      version: current.version,
    };
  });
  const store: MdKitBackendStore = {
    createCheckpoint,
    getLatestCheckpoint: () => checkpoints.at(-1) ?? null,
    listDocumentVersions: () => checkpoints,
    readDocument: () => current,
    readDocumentVersion: ({ versionId }) =>
      checkpoints.find((checkpoint) => checkpoint.id === versionId) ?? null,
    writeDocument,
  };

  return {
    checkpoints,
    createCheckpoint,
    get current() {
      return current;
    },
    store,
    writeDocument,
  };
};

describe("createMdKitBackend", () => {
  it("creates a checkpoint after a successful write when policy triggers", async () => {
    const fixture = createStore({
      checkpoints: [
        {
          content: "initial",
          createdAt: "2026-04-30T12:00:00.000Z",
          id: "checkpoint-1",
        },
      ],
    });
    const mdkit = createMdKitBackend({
      checkpointPolicy: CheckpointPolicy.always(),
      store: fixture.store,
    });

    await expect(
      mdkit.writeDocument({
        baseVersion: "0",
        content: "updated",
        documentId: "docs/example.md",
      }),
    ).resolves.toEqual({
      updatedAt: "2026-04-30T12:10:00.000Z",
      version: "1",
    });

    expect(fixture.createCheckpoint).toHaveBeenCalledWith({
      content: "updated",
      documentId: "docs/example.md",
      sourceRevision: "1",
    });
  });

  it("does not create checkpoints for conflicts or never policy", async () => {
    const fixture = createStore();
    const mdkit = createMdKitBackend({
      checkpointPolicy: CheckpointPolicy.never(),
      store: fixture.store,
    });

    await mdkit.writeDocument({
      baseVersion: "0",
      content: "updated",
      documentId: "docs/example.md",
    });
    await mdkit.writeDocument({
      baseVersion: "0",
      content: "stale",
      documentId: "docs/example.md",
    });

    expect(fixture.createCheckpoint).not.toHaveBeenCalled();
  });

  it("passes computed distance and content to custom checkpoint policies", async () => {
    const fixture = createStore({
      checkpoints: [
        {
          content: "abc",
          createdAt: new Date(Date.now()).toISOString(),
          id: "checkpoint-1",
        },
      ],
    });
    const shouldCheckpoint = vi.fn(() => true);
    const mdkit = createMdKitBackend({
      checkpointPolicy: CheckpointPolicy.function(shouldCheckpoint),
      store: fixture.store,
    });

    await mdkit.writeDocument({
      baseVersion: "0",
      content: "abcdef",
      documentId: "docs/example.md",
    });

    expect(shouldCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        currentContent: "abcdef",
        editDistance: 3,
        previousCheckpointContent: "abc",
        timeSinceLastCheckpointMs: expect.any(Number),
      }),
    );
  });

  it("restores a checkpoint and preserves uncheckpointed current content first", async () => {
    const fixture = createStore({
      current: {
        content: "current draft",
        updatedAt: "2026-04-30T12:03:00.000Z",
        version: "3",
      },
      checkpoints: [
        {
          content: "published",
          createdAt: "2026-04-30T12:00:00.000Z",
          id: "checkpoint-1",
        },
      ],
    });
    const mdkit = createMdKitBackend({ store: fixture.store });

    await mdkit.restoreDocumentVersion?.({
      documentId: "docs/example.md",
      versionId: "checkpoint-1",
    });

    expect(fixture.createCheckpoint).toHaveBeenCalledWith({
      content: "current draft",
      documentId: "docs/example.md",
      sourceRevision: "3",
    });
    expect(fixture.current.content).toBe("published");
    expect(fixture.writeDocument).toHaveBeenLastCalledWith({
      baseVersion: "3",
      content: "published",
      documentId: "docs/example.md",
      force: true,
    });
  });
});
