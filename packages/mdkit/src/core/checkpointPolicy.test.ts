import { describe, expect, it } from "vitest";
import {
  CheckpointPolicy,
  measureMdKitEditDistance,
} from "./checkpointPolicy";

const policyInput = {
  currentContent: "hello world",
  documentId: "docs/example.md",
  editDistance: 11,
  previousCheckpoint: null,
  previousCheckpointContent: null,
  timeSinceLastCheckpointMs: null,
  writeInput: {
    baseVersion: "0",
    content: "hello world",
    documentId: "docs/example.md",
  },
  writeResult: {
    version: "1",
  },
};

describe("CheckpointPolicy", () => {
  it("measures edit distance between two markdown strings", () => {
    expect(measureMdKitEditDistance("kitten", "sitting")).toBe(3);
    expect(measureMdKitEditDistance("", "markdown")).toBe(8);
    expect(measureMdKitEditDistance("same", "same")).toBe(0);
  });

  it("supports never and always policies", async () => {
    expect(await CheckpointPolicy.never().shouldCheckpoint(policyInput)).toBe(
      false,
    );
    expect(await CheckpointPolicy.always().shouldCheckpoint(policyInput)).toBe(
      true,
    );
  });

  it("smart policy checkpoints when there is no previous checkpoint", async () => {
    expect(await CheckpointPolicy.smart().shouldCheckpoint(policyInput)).toBe(
      true,
    );
  });

  it("smart policy checkpoints when distance or time crosses the threshold", async () => {
    const previousCheckpoint = {
      content: "hello",
      createdAt: "2026-04-30T12:00:00.000Z",
      id: "checkpoint-1",
    };

    expect(
      await CheckpointPolicy.smart({ minEditDistance: 5 }).shouldCheckpoint({
        ...policyInput,
        editDistance: 5,
        previousCheckpoint,
        previousCheckpointContent: previousCheckpoint.content,
        timeSinceLastCheckpointMs: 10,
      }),
    ).toBe(true);

    expect(
      await CheckpointPolicy.smart({ minIntervalMs: 100 }).shouldCheckpoint({
        ...policyInput,
        editDistance: 1,
        previousCheckpoint,
        previousCheckpointContent: previousCheckpoint.content,
        timeSinceLastCheckpointMs: 100,
      }),
    ).toBe(true);

    expect(
      await CheckpointPolicy.smart({
        minEditDistance: 5,
        minIntervalMs: 100,
      }).shouldCheckpoint({
        ...policyInput,
        editDistance: 4,
        previousCheckpoint,
        previousCheckpointContent: previousCheckpoint.content,
        timeSinceLastCheckpointMs: 99,
      }),
    ).toBe(false);
  });

  it("passes all inputs to custom policy functions", async () => {
    const policy = CheckpointPolicy.function(
      ({
        currentContent,
        editDistance,
        previousCheckpointContent,
        timeSinceLastCheckpointMs,
      }) =>
        currentContent.includes("Published") ||
        previousCheckpointContent === null ||
        editDistance > 10 ||
        timeSinceLastCheckpointMs === null,
    );

    expect(
      await policy.shouldCheckpoint({
        ...policyInput,
        currentContent: "# Published",
        editDistance: 0,
        previousCheckpointContent: "# Draft",
        timeSinceLastCheckpointMs: 1,
      }),
    ).toBe(true);
  });
});
