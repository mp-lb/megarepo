import { MdCompileError } from "./errors.js";

const FENCE = /^\s{0,3}(```+|~~~+)/;
const ATX_HEADING = /^\s{0,3}#{1,6}(\s|$)/;
const SETEXT_UNDERLINE = /^\s{0,3}=+\s*$/;

/**
 * Throws if `content` contains a markdown heading. Headings are owned by the
 * folder structure, so input files may only contain body content — code blocks,
 * lists, quotes, tables, etc. are all fine.
 *
 * Detection skips fenced code blocks (a `#` inside a fence is code, not a
 * heading). It catches ATX headings (`# ...`) and setext H1 (`text` underlined
 * with `===`). Setext H2 (`---`) is intentionally not flagged because `---` is
 * ambiguous with thematic breaks, front matter, and table delimiters.
 */
export function validateNoHeadings(content: string, label: string): void {
  const lines = content.split("\n");
  let inFence = false;
  let prevBlank = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    if (FENCE.test(line)) {
      inFence = !inFence;
      prevBlank = false;
      continue;
    }
    if (inFence) {
      prevBlank = false;
      continue;
    }

    if (ATX_HEADING.test(line)) {
      throw new MdCompileError(
        `${label}:${i + 1} contains a heading ("${line.trim()}"). ` +
          `Headings are controlled by the folder structure — remove it.`,
      );
    }
    if (SETEXT_UNDERLINE.test(line) && !prevBlank) {
      throw new MdCompileError(
        `${label}:${i + 1} contains a setext heading underline ("${line.trim()}"). ` +
          `Headings are controlled by the folder structure — remove it.`,
      );
    }

    prevBlank = line.trim().length === 0;
  }
}
