import { describe, expect, it } from "vitest";
import { render } from "./render.js";
import type { FolderNode } from "./types.js";

const folder = (name: string, extra: Partial<FolderNode> = {}): FolderNode => ({
  name,
  rawName: name,
  files: [],
  folders: [],
  ...extra,
});

describe("render", () => {
  it("turns folders into headings and files into body", () => {
    const root = folder("", {
      folders: [
        folder("process-management", {
          files: [{ name: "intro", rawName: "intro.md", content: "Use zapper." }],
        }),
      ],
    });

    expect(render(root, {})).toBe("# Process management\n\nUse zapper.\n");
  });

  it("nests headings by depth and honours title override", () => {
    const root = folder("", {
      folders: [
        folder("stack", {
          title: "Tech stack",
          files: [{ name: "a", rawName: "a.md", content: "Top." }],
          folders: [
            folder("trpc", {
              title: "tRPC",
              files: [{ name: "b", rawName: "b.md", content: "Nested." }],
            }),
          ],
        }),
      ],
    });

    expect(render(root, {})).toBe(
      "# Tech stack\n\nTop.\n\n## tRPC\n\nNested.\n",
    );
  });

  it("emits a title as H1 and shifts sections to H2", () => {
    const root = folder("", {
      files: [{ name: "lead", rawName: "lead.md", content: "Preamble." }],
      folders: [folder("setup", { files: [{ name: "s", rawName: "s.md", content: "Go." }] })],
    });

    expect(render(root, { title: "mgr" })).toBe(
      "# mgr\n\nPreamble.\n\n## Setup\n\nGo.\n",
    );
  });

  it("respects an explicit order override", () => {
    const root = folder("", {
      order: ["second", "first"],
      folders: [
        folder("first", { files: [{ name: "x", rawName: "x.md", content: "1" }] }),
        folder("second", { files: [{ name: "y", rawName: "y.md", content: "2" }] }),
      ],
    });

    expect(render(root, {})).toBe("# Second\n\n2\n\n# First\n\n1\n");
  });
});
