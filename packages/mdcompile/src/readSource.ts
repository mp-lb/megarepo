import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { MdCompileError } from "./errors.js";
import { stripOrderPrefix } from "./deriveHeading.js";
import { validateNoHeadings } from "./validateNoHeadings.js";
import type { FolderConfig, FolderNode } from "./types.js";

const CONFIG_FILE = "mdcompile.json";
const MARKDOWN = /\.(md|markdown)$/i;

function readConfig(dir: string): FolderConfig {
  const path = join(dir, CONFIG_FILE);
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new MdCompileError(`${path} is not valid JSON: ${String(cause)}`);
  }
  const config = parsed as FolderConfig;
  if (config.title !== undefined && typeof config.title !== "string") {
    throw new MdCompileError(`${path}: "title" must be a string.`);
  }
  if (config.order !== undefined && !Array.isArray(config.order)) {
    throw new MdCompileError(`${path}: "order" must be an array of names.`);
  }
  return config;
}

/** Reads a source directory into a `FolderNode` tree, validating as it goes. */
export function readSource(dir: string): FolderNode {
  return readFolder(dir, basename(dir));
}

function readFolder(dir: string, rawName: string): FolderNode {
  const config = readConfig(dir);
  const node: FolderNode = {
    name: stripOrderPrefix(rawName),
    rawName,
    title: config.title,
    order: config.order,
    files: [],
    folders: [],
  };

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === CONFIG_FILE) continue;
    const full = join(dir, entry.name);

    if (entry.isDirectory()) {
      node.folders.push(readFolder(full, entry.name));
      continue;
    }
    if (!MARKDOWN.test(entry.name)) continue;

    const content = readFileSync(full, "utf8");
    validateNoHeadings(content, full);
    node.files.push({
      name: stripOrderPrefix(entry.name.replace(MARKDOWN, "")),
      rawName: entry.name,
      content,
    });
  }

  return node;
}
