import { deriveHeading } from "./deriveHeading.js";
import { orderChildren } from "./ordering.js";
import type { CompileOptions, FolderNode } from "./types.js";

function headingText(folder: FolderNode): string {
  return folder.title ?? deriveHeading(folder.name);
}

function bodyBlocks(folder: FolderNode): string[] {
  const { files } = orderChildren(folder);
  return files.map((f) => f.content.replace(/\n+$/, ""));
}

function renderFolder(folder: FolderNode, level: number): string[] {
  const clamped = Math.min(level, 6);
  const blocks: string[] = [`${"#".repeat(clamped)} ${headingText(folder)}`];
  blocks.push(...bodyBlocks(folder));
  for (const child of orderChildren(folder).folders) {
    blocks.push(...renderFolder(child, level + 1));
  }
  return blocks;
}

/**
 * Renders a merged tree to a single markdown document. The virtual root's
 * direct files become a preamble (no heading); its sub-folders become the
 * top-level sections at `baseLevel`. An optional `title` is emitted as a lone
 * H1 above everything.
 */
export function render(
  root: FolderNode,
  options: Pick<CompileOptions, "title" | "baseLevel">,
): string {
  const baseLevel = options.baseLevel ?? (options.title ? 2 : 1);
  const blocks: string[] = [];

  if (options.title) blocks.push(`# ${options.title}`);
  blocks.push(...bodyBlocks(root));
  for (const child of orderChildren(root).folders) {
    blocks.push(...renderFolder(child, baseLevel));
  }

  return blocks.filter((b) => b.length > 0).join("\n\n") + "\n";
}
