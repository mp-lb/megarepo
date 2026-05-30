/**
 * The in-memory model of a source tree.
 *
 * A `FolderNode` becomes a heading; its `files` are the body rendered under that
 * heading and its `folders` are the nested sub-sections. `FileNode`s never carry
 * a heading of their own — headings come exclusively from folder structure.
 */

export type FileNode = {
  /** Base name without the ordering prefix or extension, e.g. `overview`. */
  name: string;
  /** Original base name on disk, e.g. `01-overview.md`, used for ordering. */
  rawName: string;
  /** Verbatim markdown body. Must not contain any headings. */
  content: string;
};

export type FolderNode = {
  /** Base name without the ordering prefix, e.g. `process-management`. */
  name: string;
  /** Original base name on disk, e.g. `02-process-management`, used for ordering. */
  rawName: string;
  /** Heading text override from this folder's `mdcompile.json`, if any. */
  title?: string;
  /** Explicit child ordering (by `name`) from `mdcompile.json`, if any. */
  order?: string[];
  files: FileNode[];
  folders: FolderNode[];
};

/** Per-folder config file, named `mdcompile.json`. */
export type FolderConfig = {
  /** Overrides the heading text derived from the folder name. */
  title?: string;
  /** Explicit ordering of children by their derived `name`. */
  order?: string[];
};

export type CompileOptions = {
  /** One or more source directories, merged left-to-right (later wins). */
  sources: string[];
  /** Optional document title, emitted as a single H1 before everything else. */
  title?: string;
  /**
   * Heading level of top-level sections. Defaults to 2 when `title` is set
   * (so the title owns H1), otherwise 1.
   */
  baseLevel?: number;
};
