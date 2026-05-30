import { describe, expect, it } from "vitest";
import { normalizeMarkdownSerialization } from "./normalizeMarkdownSerialization";

describe("normalizeMarkdownSerialization", () => {
  it("removes TipTap non-breaking-space placeholders from empty list items", () => {
    expect(
      normalizeMarkdownSerialization(
        "- first\n- &nbsp;\n- third\n\n1. first\n2. \u00a0",
      ),
    ).toBe("- first\n- \n- third\n\n1. first\n2. ");
  });

  it("does not remove non-breaking-space text outside empty list items", () => {
    expect(normalizeMarkdownSerialization("Paragraph &nbsp;\n\n- real")).toBe(
      "Paragraph &nbsp;\n\n- real",
    );
  });

  it("removes standalone TipTap non-breaking-space placeholder lines", () => {
    expect(normalizeMarkdownSerialization("- first\n\n&nbsp;\n\n\u00a0")).toBe(
      "- first\n\n\n",
    );
  });

  it("normalizes hydrated empty paragraphs back to the original newline run", () => {
    expect(
      normalizeMarkdownSerialization(
        "Before\n\n&nbsp;\n\n&nbsp;\n\n&nbsp;\n\nAfter",
      ),
    ).toBe("Before\n\n\n\n\nAfter");
  });
});
