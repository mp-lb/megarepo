#!/usr/bin/env node
import { run } from "./cli.js";

export { compile } from "./compile.js";
export { MdCompileError } from "./errors.js";
export type {
  CompileOptions,
  FileNode,
  FolderConfig,
  FolderNode,
} from "./types.js";

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isMain) {
  process.exit(run(process.argv.slice(2), process));
}
