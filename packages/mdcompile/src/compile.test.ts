import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { compile } from "./compile.js";
import { MdCompileError } from "./errors.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "mdcompile-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function write(rel: string, content: string): void {
  const path = join(root, rel);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
}

describe("compile", () => {
  it("merges two sources, later source overriding files", () => {
    write("base/setup/intro.md", "Base intro.");
    write("base/setup/extra.md", "Base extra.");
    write("layer/setup/intro.md", "Overridden intro.");
    write("layer/mongodb/mongodb.json", "{}"); // ignored, not markdown
    write("layer/mongodb/mongodb.md", "Local Mongo.");
    write("layer/mongodb/mdcompile.json", JSON.stringify({ title: "MongoDB" }));

    const out = compile({
      sources: [join(root, "base"), join(root, "layer")],
    });

    expect(out).toContain("# Setup");
    expect(out).toContain("Overridden intro.");
    expect(out).toContain("Base extra.");
    expect(out).not.toContain("Base intro.");
    expect(out).toContain("# MongoDB");
    expect(out).toContain("Local Mongo.");
  });

  it("throws when an input file contains a heading", () => {
    write("base/setup/intro.md", "## sneaky heading");
    expect(() => compile({ sources: [join(root, "base")] })).toThrow(
      MdCompileError,
    );
  });
});
