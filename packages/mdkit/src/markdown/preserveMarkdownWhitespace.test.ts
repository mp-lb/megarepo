import { describe, expect, it } from "vitest";
import { preserveMarkdownWhitespace } from "./preserveMarkdownWhitespace";

describe("preserveMarkdownWhitespace", () => {
  it("preserves expanded blank-line runs between unchanged blocks", () => {
    expect(
      preserveMarkdownWhitespace(
        "# Title\n\n\nFirst paragraph.\n\n\n\nSecond paragraph.",
        "# Title\n\nFirst paragraph.\n\nSecond paragraph.",
      ),
    ).toBe("# Title\n\n\nFirst paragraph.\n\n\n\nSecond paragraph.");
  });

  it("preserves blank-line runs between unchanged list and paragraph blocks", () => {
    expect(
      preserveMarkdownWhitespace(
        "- first\n- second\n\n\nParagraph.",
        "- first\n- second\n\nParagraph.",
      ),
    ).toBe("- first\n- second\n\n\nParagraph.");
  });

  it("preserves blank-line runs between unchanged blockquote and table blocks", () => {
    expect(
      preserveMarkdownWhitespace(
        "> Quoted text.\n\n\n| A | B |\n| - | - |\n| 1 | 2 |",
        "> Quoted text.\n\n| A | B |\n| - | - |\n| 1 | 2 |",
      ),
    ).toBe("> Quoted text.\n\n\n| A | B |\n| - | - |\n| 1 | 2 |");
  });

  it("preserves leading and trailing blank-line runs when the body is unchanged", () => {
    expect(
      preserveMarkdownWhitespace(
        "\n\n# Title\n\nParagraph.\n\n\n",
        "# Title\n\nParagraph.",
      ),
    ).toBe("\n\n# Title\n\nParagraph.\n\n\n");
  });

  it("keeps serialized markdown when adjacent block content changed", () => {
    expect(
      preserveMarkdownWhitespace(
        "# Title\n\n\nFirst paragraph.",
        "# Title\n\nChanged paragraph.",
      ),
    ).toBe("# Title\n\nChanged paragraph.");
  });

  it("does not preserve separators from inside fenced code blocks", () => {
    expect(
      preserveMarkdownWhitespace(
        "```ts\nconst a = 1;\n\n\nconst b = 2;\n```\n\n\nAfter.",
        "```ts\nconst a = 1;\n\nconst b = 2;\n```\n\nAfter.",
      ),
    ).toBe("```ts\nconst a = 1;\n\nconst b = 2;\n```\n\nAfter.");
  });

  it("preserves separators around unchanged fenced code blocks", () => {
    expect(
      preserveMarkdownWhitespace(
        "Before.\n\n\n```ts\nconst a = 1;\n\nconst b = 2;\n```\n\n\nAfter.",
        "Before.\n\n```ts\nconst a = 1;\n\nconst b = 2;\n```\n\nAfter.",
      ),
    ).toBe("Before.\n\n\n```ts\nconst a = 1;\n\nconst b = 2;\n```\n\n\nAfter.");
  });
});
