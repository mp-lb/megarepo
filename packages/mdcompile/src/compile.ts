import { mergeNodes } from "./mergeNodes.js";
import { readSource } from "./readSource.js";
import { render } from "./render.js";
import type { CompileOptions } from "./types.js";

/**
 * Reads each source directory, merges them (later sources win), and renders the
 * result to a single markdown string. Throws `MdCompileError` if any input file
 * contains a heading or a config file is malformed.
 */
export function compile(options: CompileOptions): string {
  const roots = options.sources.map(readSource);
  const merged = mergeNodes(roots);
  return render(merged, options);
}
