import { describe, expect, it } from "vitest";
import { MdCompileError } from "./errors.js";
import { validateNoHeadings } from "./validateNoHeadings.js";

describe("validateNoHeadings", () => {
  it("allows body content without headings", () => {
    const content = [
      "A paragraph.",
      "",
      "- a list",
      "- item",
      "",
      "> a quote",
    ].join("\n");
    expect(() => validateNoHeadings(content, "f.md")).not.toThrow();
  });

  it("ignores hashes inside fenced code blocks", () => {
    const content = ["```sh", "# this is a comment", "echo hi", "```"].join("\n");
    expect(() => validateNoHeadings(content, "f.md")).not.toThrow();
  });

  it("rejects an ATX heading", () => {
    expect(() => validateNoHeadings("## Nope", "f.md")).toThrow(MdCompileError);
  });

  it("rejects a setext H1 underline", () => {
    expect(() => validateNoHeadings("Title\n=====", "f.md")).toThrow(
      MdCompileError,
    );
  });

  it("reports the file and line in the message", () => {
    expect(() => validateNoHeadings("ok\n\n# bad", "docs/f.md")).toThrow(
      /docs\/f\.md:3/,
    );
  });
});
