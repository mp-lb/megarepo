/** Strips a leading ordering prefix like `01-` or `02_` from a base name. */
export function stripOrderPrefix(rawName: string): string {
  return rawName.replace(/^\d+[-_]/, "");
}

/**
 * Derives a heading from a folder name: hyphens/underscores become spaces and
 * the first letter is capitalised. e.g. `process-management` -> `Process
 * management`. Use an `mdcompile.json` `title` to override (e.g. `MongoDB`).
 */
export function deriveHeading(name: string): string {
  const words = name.replace(/[-_]+/g, " ").trim();
  if (words.length === 0) return words;
  return words.charAt(0).toUpperCase() + words.slice(1);
}
