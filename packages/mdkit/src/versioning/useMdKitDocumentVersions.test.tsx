import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MdKitDocumentAdapter } from "../document/documentTypes";
import { useMdKitDocumentVersions } from "./useMdKitDocumentVersions";

describe("useMdKitDocumentVersions", () => {
  it("degrades cleanly when the adapter has no versioning methods", async () => {
    const adapter = {};

    const { result } = renderHook(() =>
      useMdKitDocumentVersions({
        adapter,
        documentId: "docs/example.md",
      }),
    );

    await act(async () => {
      await result.current.refresh();
      await result.current.openVersion("missing");
    });

    expect(result.current.hasVersioning).toBe(false);
    expect(result.current.versions).toEqual([]);
    expect(result.current.selectedVersion).toBeNull();
    expect(result.current.selectedVersionId).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("keeps the selected version preview open after loading it", async () => {
    const adapter: Pick<
      MdKitDocumentAdapter,
      "listDocumentVersions" | "readDocumentVersion"
    > = {
      listDocumentVersions: vi.fn(async () => [
        {
          createdAt: "2026-01-01T00:00:00.000Z",
          id: "1",
          label: "Version 1",
          version: 1,
        },
      ]),
      readDocumentVersion: vi.fn(async () => ({
        content: "Version one content",
        createdAt: "2026-01-01T00:00:00.000Z",
        id: "1",
        label: "Version 1",
        updatedAt: "2026-01-01T00:00:00.000Z",
        version: 1,
      })),
    };

    const { result } = renderHook(() =>
      useMdKitDocumentVersions({
        adapter,
        documentId: "docs/example.md",
      }),
    );

    await waitFor(() => {
      expect(result.current.versions).toHaveLength(1);
    });

    await act(async () => {
      await result.current.openVersion("1");
    });

    await waitFor(() => {
      expect(result.current.selectedVersionId).toBe("1");
      expect(result.current.selectedVersion?.content).toBe(
        "Version one content",
      );

      expect(result.current.isLoading).toBe(false);
    });

    expect(adapter.listDocumentVersions).toHaveBeenCalledTimes(1);
  });

  it("can disable versioning even when the adapter exposes version methods", async () => {
    const adapter: Pick<
      MdKitDocumentAdapter,
      "listDocumentVersions" | "readDocumentVersion"
    > = {
      listDocumentVersions: vi.fn(async () => []),
      readDocumentVersion: vi.fn(async () => null),
    };

    const { result } = renderHook(() =>
      useMdKitDocumentVersions({
        adapter,
        documentId: "docs/example.md",
        enabled: false,
      }),
    );

    await act(async () => {
      await result.current.refresh();
      await result.current.openVersion("1");
    });

    expect(result.current.hasVersioning).toBe(false);
    expect(adapter.listDocumentVersions).not.toHaveBeenCalled();
    expect(adapter.readDocumentVersion).not.toHaveBeenCalled();
  });
});
