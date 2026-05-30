import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MdKitDocumentAdapter } from "./documentTypes";
import { useMdKitDocument } from "./useMdKitDocument";

describe("useMdKitDocument", () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("marks autosave as pending during the debounce window", async () => {
    const adapter: Pick<
      MdKitDocumentAdapter,
      "readDocument" | "writeDocument" | "resyncDocument"
    > = {
      readDocument: vi.fn(async () => ({
        content: "Initial content",
        updatedAt: "2026-01-01T00:00:00.000Z",
        version: 1,
      })),
      resyncDocument: vi.fn(async () => ({
        content: "Initial content",
        updatedAt: "2026-01-01T00:00:00.000Z",
        version: 1,
      })),
      writeDocument: vi.fn(async () => ({
        updatedAt: "2026-01-01T00:00:01.000Z",
        version: 2,
      })),
    };

    const { result } = renderHook(() =>
      useMdKitDocument({
        adapter,
        debounceMs: 250,
        documentId: "docs/example.md",
        pollMs: 0,
      }),
    );

    await waitFor(() => {
      expect(result.current.value).toBe("Initial content");
    });

    vi.useFakeTimers();

    act(() => {
      result.current.setContent("Changed content");
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.saveStatus).toBe("pending");
    expect(adapter.writeDocument).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    expect(result.current.saveStatus).toBe("saved");
    expect(result.current.isDirty).toBe(false);

    expect(adapter.writeDocument).toHaveBeenCalledWith({
      baseVersion: 1,
      content: "Changed content",
      documentId: "docs/example.md",
    });
  });

  it("exposes remote, local, and base content when a save conflicts", async () => {
    const adapter: Pick<
      MdKitDocumentAdapter,
      "readDocument" | "writeDocument" | "resyncDocument"
    > = {
      readDocument: vi
        .fn()
        .mockResolvedValueOnce({
          content: "Base content",
          updatedAt: "2026-01-01T00:00:00.000Z",
          version: 1,
        })
        .mockResolvedValueOnce({
          content: "Remote content",
          updatedAt: "2026-01-01T00:00:02.000Z",
          version: 2,
        }),
      resyncDocument: vi.fn(),
      writeDocument: vi.fn(async () => ({
        conflict: true,
        updatedAt: "2026-01-01T00:00:02.000Z",
        version: 2,
      })),
    };

    const { result } = renderHook(() =>
      useMdKitDocument({
        adapter,
        documentId: "docs/example.md",
        pollMs: 0,
      }),
    );

    await waitFor(() => {
      expect(result.current.value).toBe("Base content");
    });

    act(() => {
      result.current.setContent("Local content");
    });

    await act(async () => {
      await result.current.saveNow();
    });

    expect(result.current.conflict).toBe(true);
    expect(result.current.conflictDetails).toEqual({
      baseContent: "Base content",
      localContent: "Local content",
      remoteContent: "Remote content",
      remoteUpdatedAt: "2026-01-01T00:00:02.000Z",
      remoteVersion: 2,
    });
  });

  it("force saves local content after a conflict", async () => {
    const adapter: Pick<
      MdKitDocumentAdapter,
      "readDocument" | "writeDocument" | "resyncDocument"
    > = {
      readDocument: vi
        .fn()
        .mockResolvedValueOnce({
          content: "Base content",
          updatedAt: "2026-01-01T00:00:00.000Z",
          version: 1,
        })
        .mockResolvedValueOnce({
          content: "Remote content",
          updatedAt: "2026-01-01T00:00:02.000Z",
          version: 2,
        }),
      resyncDocument: vi.fn(),
      writeDocument: vi
        .fn()
        .mockResolvedValueOnce({
          conflict: true,
          updatedAt: "2026-01-01T00:00:02.000Z",
          version: 2,
        })
        .mockResolvedValueOnce({
          updatedAt: "2026-01-01T00:00:03.000Z",
          version: 3,
        }),
    };

    const { result } = renderHook(() =>
      useMdKitDocument({
        adapter,
        documentId: "docs/example.md",
        pollMs: 0,
      }),
    );

    await waitFor(() => {
      expect(result.current.value).toBe("Base content");
    });

    act(() => {
      result.current.setContent("Local content");
    });

    await act(async () => {
      await result.current.saveNow();
    });

    expect(result.current.conflict).toBe(true);

    await act(async () => {
      await result.current.forceSave();
    });

    expect(result.current.conflict).toBe(false);
    expect(result.current.isDirty).toBe(false);
    expect(adapter.writeDocument).toHaveBeenLastCalledWith({
      baseVersion: null,
      content: "Local content",
      documentId: "docs/example.md",
      force: true,
    });
  });
});
