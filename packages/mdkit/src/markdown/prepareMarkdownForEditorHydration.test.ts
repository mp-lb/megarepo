import { describe, expect, it } from "vitest";
import { prepareMarkdownForEditorHydration } from "./prepareMarkdownForEditorHydration";

describe("prepareMarkdownForEditorHydration", () => {
  it("converts expanded blank-line runs into empty paragraphs for TipTap", () => {
    expect(
      prepareMarkdownForEditorHydration("Before\n\n\n\nAfter"),
    ).toBe("Before\n\n&nbsp;\n\n&nbsp;\n\nAfter");
  });

  it("keeps normal block separators unchanged", () => {
    expect(prepareMarkdownForEditorHydration("Before\n\nAfter")).toBe(
      "Before\n\nAfter",
    );
  });

  it("does not convert blank lines inside fenced code blocks", () => {
    expect(
      prepareMarkdownForEditorHydration(
        "Before\n\n```ts\nconst one = 1;\n\n\nconst two = 2;\n```\n\n\nAfter",
      ),
    ).toBe(
      "Before\n\n```ts\nconst one = 1;\n\n\nconst two = 2;\n```\n\n&nbsp;\n\nAfter",
    );
  });
});
