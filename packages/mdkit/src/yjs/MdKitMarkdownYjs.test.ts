import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import {
  markdownToMdKitYjs,
  mdKitYjsToMarkdown,
  replaceMdKitYjsMarkdown,
  yjs,
} from "./MdKitMarkdownYjs";

describe("MdKit Markdown/Yjs conversion", () => {
  it("round-trips markdown through the default Yjs XML fragment", () => {
    const markdown = [
      "# Title",
      "",
      "Paragraph with **bold** text.",
      "",
      "```ts",
      "const value: string = \"ok\";",
      "```",
    ].join("\n");

    const state = markdownToMdKitYjs(markdown);

    expect(mdKitYjsToMarkdown(state)).toBe(markdown);
  });

  it("round-trips YAML front matter when it is ignored by the editor body", () => {
    const markdown = ['---', 'key: ["value"]', "---", "", "# Title"].join(
      "\n",
    );

    const state = markdownToMdKitYjs(markdown, {
      ignoreYamlFrontMatter: true,
    });

    expect(mdKitYjsToMarkdown(state)).toBe(markdown);
  });

  it("uses the same Markdown serialization normalization as editor onChange", () => {
    const state = markdownToMdKitYjs("Before\n\n\n\nAfter");

    expect(mdKitYjsToMarkdown(state)).toBe("Before\n\n\nAfter");
  });

  it("preserves code block language attrs in Yjs state replacement", () => {
    const ydoc = new Y.Doc();
    const state = replaceMdKitYjsMarkdown(
      ydoc,
      "```tsx\nconst element = <div />;\n```",
    );

    expect(mdKitYjsToMarkdown(state)).toBe(
      "```tsx\nconst element = <div />;\n```",
    );
  });

  it("replaces markdown in an existing open Y.Doc", () => {
    const ydoc = new Y.Doc();

    replaceMdKitYjsMarkdown(ydoc, "# Old");
    const state = replaceMdKitYjsMarkdown(ydoc, "# New\n\n- item");

    expect(mdKitYjsToMarkdown(state)).toBe("# New\n\n- item");
  });

  it("supports custom fragment names", () => {
    const state = yjs.markdownToMdKitYjs("# Custom", {
      fragmentName: "body",
    });

    expect(mdKitYjsToMarkdown(state, { fragmentName: "body" })).toBe(
      "# Custom",
    );
    expect(mdKitYjsToMarkdown(state)).toBe("");
  });
});
