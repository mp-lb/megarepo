import { describe, expect, it } from "vitest";
import { shouldPastePlainTextAsMarkdown } from "./MarkdownPasteExtension";

describe("shouldPastePlainTextAsMarkdown", () => {
  it("recognizes block markdown", () => {
    expect(
      shouldPastePlainTextAsMarkdown("# Title\n\n- one\n- two"),
    ).toBe(true);
  });

  it("recognizes inline markdown", () => {
    expect(
      shouldPastePlainTextAsMarkdown("Read [the docs](https://example.com)."),
    ).toBe(true);
  });

  it("leaves ordinary prose to the default paste handler", () => {
    expect(
      shouldPastePlainTextAsMarkdown("This is just a normal pasted sentence."),
    ).toBe(false);
  });
});
