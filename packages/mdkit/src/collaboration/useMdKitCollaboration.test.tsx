import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMdKitCollaboration } from "./useMdKitCollaboration";

describe("useMdKitCollaboration", () => {
  it("returns null when collaboration is disabled", () => {
    const { result } = renderHook(() =>
      useMdKitCollaboration({
        collaborator: {
          id: "user-1",
          name: "Ada",
        },
        documentId: "docs/example.md",
        enabled: false,
        endpoint: "ws://localhost:4312/collaboration",
      }),
    );

    expect(result.current).toBeNull();
  });

  it("returns null without a document or endpoint", () => {
    const { result: withoutDocument } = renderHook(() =>
      useMdKitCollaboration({
        collaborator: {
          id: "user-1",
          name: "Ada",
        },
        documentId: null,
        endpoint: "ws://localhost:4312/collaboration",
      }),
    );

    const { result: withoutEndpoint } = renderHook(() =>
      useMdKitCollaboration({
        collaborator: {
          id: "user-1",
          name: "Ada",
        },
        documentId: "docs/example.md",
        endpoint: null,
      }),
    );

    expect(withoutDocument.current).toBeNull();
    expect(withoutEndpoint.current).toBeNull();
  });
});
