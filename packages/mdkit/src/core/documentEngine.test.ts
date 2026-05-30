import { describe, expect, it } from "vitest";
import {
  createMdKitDocumentRecord,
  detectMdKitDocumentConflict,
  restoreMdKitDocumentVersion,
  writeMdKitDocumentRecord,
} from "./documentEngine";

const now = "2026-04-30T12:00:00.000Z";

describe("documentEngine", () => {
  it("creates a current markdown snapshot with an initial version", () => {
    const record = createMdKitDocumentRecord({
      content: "# Initial",
      now,
    });

    expect(record.current).toEqual({
      content: "# Initial",
      updatedAt: now,
      version: "0",
    });
    expect(record.versions).toEqual([
      {
        content: "# Initial",
        createdAt: now,
        id: "0",
        label: "Initial",
        updatedAt: now,
        version: "0",
      },
    ]);
  });

  it("writes a new version when the base version matches", () => {
    const record = createMdKitDocumentRecord({ now });
    const written = writeMdKitDocumentRecord(record, {
      baseVersion: "0",
      content: "# Saved",
      now: "2026-04-30T12:01:00.000Z",
    });

    expect(written.result).toEqual({
      updatedAt: "2026-04-30T12:01:00.000Z",
      version: "1",
    });
    expect(written.record.current).toMatchObject({
      content: "# Saved",
      version: "1",
    });
    expect(written.record.versions.map((version) => version.id)).toEqual([
      "0",
      "1",
    ]);
  });

  it("returns a conflict when the base version is stale", () => {
    const record = createMdKitDocumentRecord({ now });
    const first = writeMdKitDocumentRecord(record, {
      baseVersion: "0",
      content: "first",
      now: "2026-04-30T12:01:00.000Z",
    });
    const second = writeMdKitDocumentRecord(first.record, {
      baseVersion: "0",
      content: "second",
      now: "2026-04-30T12:02:00.000Z",
    });

    expect(second.result).toEqual({
      conflict: true,
      updatedAt: "2026-04-30T12:01:00.000Z",
      version: "1",
    });
    expect(second.record).toBe(first.record);
  });

  it("can force-write a local version over a remote conflict", () => {
    const record = createMdKitDocumentRecord({ now });
    const first = writeMdKitDocumentRecord(record, {
      baseVersion: "0",
      content: "remote",
      now: "2026-04-30T12:01:00.000Z",
    });
    const forced = writeMdKitDocumentRecord(first.record, {
      baseVersion: "0",
      content: "local",
      force: true,
      label: "Force save",
      now: "2026-04-30T12:02:00.000Z",
    });

    expect(forced.record.current).toMatchObject({
      content: "local",
      version: "2",
    });
    expect(forced.record.versions.at(-1)).toMatchObject({
      content: "local",
      id: "2",
      label: "Force save",
    });
  });

  it("restores a saved version into the current snapshot", () => {
    const record = createMdKitDocumentRecord({ content: "initial", now });
    const first = writeMdKitDocumentRecord(record, {
      baseVersion: "0",
      content: "later",
      now: "2026-04-30T12:01:00.000Z",
    });
    const restored = restoreMdKitDocumentVersion(first.record, {
      now: "2026-04-30T12:02:00.000Z",
      versionId: "0",
    });

    expect(restored.record.current).toMatchObject({
      content: "initial",
      version: "2",
    });
    expect(restored.record.versions.at(-1)).toMatchObject({
      content: "initial",
      label: "Restore 0",
    });
  });

  it("detects conflict from base and current version tokens", () => {
    expect(
      detectMdKitDocumentConflict({
        baseVersion: "1",
        currentVersion: "2",
      }),
    ).toBe(true);
    expect(
      detectMdKitDocumentConflict({
        baseVersion: 1,
        currentVersion: "1",
      }),
    ).toBe(false);
  });
});
