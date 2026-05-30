import type { FolderNode } from "./types.js";

function mergeTwo(base: FolderNode, over: FolderNode): FolderNode {
  const files = new Map(base.files.map((f) => [f.name, f]));
  for (const f of over.files) files.set(f.name, f);

  const folders = new Map(base.folders.map((d) => [d.name, d]));
  for (const d of over.folders) {
    const existing = folders.get(d.name);
    folders.set(d.name, existing ? mergeTwo(existing, d) : d);
  }

  return {
    name: over.name,
    rawName: over.rawName,
    title: over.title ?? base.title,
    order: over.order ?? base.order,
    files: [...files.values()],
    folders: [...folders.values()],
  };
}

/**
 * Merges source trees left-to-right. For any given path the later source wins:
 * a file replaces a same-named file, a folder's metadata (title/order) is
 * overridden, and same-named folders merge recursively.
 */
export function mergeNodes(roots: FolderNode[]): FolderNode {
  if (roots.length === 0) {
    return { name: "", rawName: "", files: [], folders: [] };
  }
  return roots.reduce((acc, next) => mergeTwo(acc, next));
}
