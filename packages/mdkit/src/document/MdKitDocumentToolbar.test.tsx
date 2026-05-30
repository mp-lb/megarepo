import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MdKitDocumentController } from "./useMdKitDocument";
import { MdKitDocumentToolbar } from "./MdKitDocumentToolbar";

const createDocumentController = (
  overrides: Partial<MdKitDocumentController> = {},
): MdKitDocumentController => ({
  conflict: false,
  conflictDetails: null,
  error: null,
  forceSave: vi.fn(async () => true),
  isDirty: false,
  isFocused: false,
  isLoading: false,
  resync: vi.fn(async () => undefined),
  revision: 0,
  saveNow: vi.fn(async () => true),
  saveStatus: "saved",
  setContent: vi.fn(),
  setFocused: vi.fn(),
  updatedAt: "2026-01-01T00:00:00.000Z",
  value: "Current markdown",
  version: 1,
  ...overrides,
});

describe("MdKitDocumentToolbar", () => {
  it("renders without versioning or collaboration", () => {
    render(<MdKitDocumentToolbar document={createDocumentController()} />);

    expect(screen.getByText("Saved")).toBeTruthy();
    expect(screen.queryByText("Collaboration off")).toBeNull();
    expect(screen.queryByRole("button", { name: "Version 1" })).toBeNull();
  });

  it("hides the version opener when versioning is absent", () => {
    const openVersionHistory = vi.fn();

    render(
      <MdKitDocumentToolbar
        document={createDocumentController()}
        onOpenVersionHistory={openVersionHistory}
      />,
    );

    expect(screen.queryByRole("button", { name: "Version 1" })).toBeNull();
    expect(openVersionHistory).not.toHaveBeenCalled();
  });

  it("opens version history when versioning is available", async () => {
    const openVersionHistory = vi.fn();
    const refresh = vi.fn(async () => undefined);

    render(
      <MdKitDocumentToolbar
        document={createDocumentController()}
        onOpenVersionHistory={openVersionHistory}
        versions={{
          error: null,
          hasVersioning: true,
          isLoading: false,
          openVersion: vi.fn(),
          refresh,
          selectedVersion: null,
          selectedVersionId: null,
          versions: [],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Version 1" }));

    expect(refresh).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(openVersionHistory).toHaveBeenCalledOnce();
    });
  });
});
