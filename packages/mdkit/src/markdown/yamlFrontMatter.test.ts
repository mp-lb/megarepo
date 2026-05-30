import { describe, expect, it } from "vitest";
import {
  extractYamlFrontMatter,
  hasYamlFrontMatter,
  parseYamlFrontMatter,
  prependYamlFrontMatter,
  removeYamlFrontMatter,
} from "./yamlFrontMatter";

describe("YAML front matter", () => {
  it("extracts and parses front matter at the start of a document", () => {
    const markdown = ['---', 'key: ["value"]', "---", "", "# Title"].join(
      "\n",
    );

    const extracted = extractYamlFrontMatter(markdown);

    expect(extracted.frontMatter?.yaml).toBe('key: ["value"]\n');
    expect(extracted.frontMatter?.data).toEqual({ key: ["value"] });
    expect(extracted.frontMatter?.raw).toBe('---\nkey: ["value"]\n---\n\n');
    expect(extracted.frontMatter?.trailingWhitespace).toBe("\n");
    expect(extracted.body).toBe("# Title");
    expect(extracted.errors).toEqual([]);
  });

  it("removes front matter and trailing whitespace before the body", () => {
    expect(removeYamlFrontMatter("---\ntitle: Test\n---\n \t\n\nBody")).toBe(
      "Body",
    );
  });

  it("detects only valid YAML front matter at the start of the document", () => {
    expect(hasYamlFrontMatter("---\ntitle: Test\n---\nBody")).toBe(true);
    expect(hasYamlFrontMatter("Intro\n---\ntitle: Test\n---")).toBe(false);
    expect(hasYamlFrontMatter("---\nkey: [\n---\nBody")).toBe(false);
  });

  it("leaves invalid YAML front matter in the body and reports parse errors", () => {
    const markdown = "---\nkey: [\n---\nBody";

    const extracted = extractYamlFrontMatter(markdown);

    expect(extracted.frontMatter).toBeNull();
    expect(extracted.body).toBe(markdown);
    expect(extracted.errors.length).toBeGreaterThan(0);
  });

  it("supports CRLF line endings", () => {
    const markdown = "---\r\nkey: value\r\n---\r\n\r\nBody";

    const extracted = extractYamlFrontMatter(markdown);

    expect(extracted.frontMatter?.data).toEqual({ key: "value" });
    expect(extracted.frontMatter?.raw).toBe("---\r\nkey: value\r\n---\r\n\r\n");
    expect(extracted.body).toBe("Body");
  });

  it("parses standalone YAML front matter content", () => {
    expect(parseYamlFrontMatter("tags:\n  - one\n  - two\n")).toEqual({
      tags: ["one", "two"],
    });
  });

  it("prepends extracted front matter to a serialized body", () => {
    const extracted = extractYamlFrontMatter("---\ntitle: Test\n---\n\nOld");

    expect(prependYamlFrontMatter(extracted.frontMatter, "New")).toBe(
      "---\ntitle: Test\n---\n\nNew",
    );
  });
});
