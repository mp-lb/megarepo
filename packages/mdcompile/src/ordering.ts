import type { FileNode, FolderNode } from "./types.js";

type Named = { name: string; rawName: string };

function leadingNumber(rawName: string): number | undefined {
  const match = rawName.match(/^(\d+)[-_]/);
  return match ? Number(match[1]) : undefined;
}

/**
 * Default comparator: items with a numeric ordering prefix sort first, in
 * numeric order; the rest follow in lexicographic order of their raw name.
 */
function compareNames(a: Named, b: Named): number {
  const na = leadingNumber(a.rawName);
  const nb = leadingNumber(b.rawName);
  if (na !== undefined && nb !== undefined) return na - nb;
  if (na !== undefined) return -1;
  if (nb !== undefined) return 1;
  return a.rawName.localeCompare(b.rawName);
}

/**
 * Orders a folder's children. Files render before sub-folders by default
 * (intro text, then sub-sections). An explicit `order` (by derived `name`)
 * overrides everything for the names it lists; unlisted items keep the default
 * order and follow.
 */
export function orderChildren(folder: FolderNode): {
  files: FileNode[];
  folders: FolderNode[];
} {
  const files = [...folder.files].sort(compareNames);
  const folders = [...folder.folders].sort(compareNames);
  if (!folder.order || folder.order.length === 0) return { files, folders };

  const rank = new Map(folder.order.map((name, i) => [name, i]));
  const byOrder = <T extends Named>(items: T[]): T[] =>
    [...items].sort((a, b) => {
      const ra = rank.get(a.name);
      const rb = rank.get(b.name);
      if (ra !== undefined && rb !== undefined) return ra - rb;
      if (ra !== undefined) return -1;
      if (rb !== undefined) return 1;
      return compareNames(a, b);
    });

  return { files: byOrder(files), folders: byOrder(folders) };
}
