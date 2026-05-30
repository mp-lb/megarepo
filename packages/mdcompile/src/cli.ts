import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { compile } from "./compile.js";
import { MdCompileError } from "./errors.js";
import type { CompileOptions } from "./types.js";

export type CliIo = {
  stdout: Pick<NodeJS.WriteStream, "write">;
  stderr: Pick<NodeJS.WriteStream, "write">;
};

const USAGE = `mdcompile — merge folders of markdown into one document.

Usage:
  mdcompile <source...> [options]

Folders become headings (their name kebab-cased, or an mdcompile.json "title");
files are the body and must not contain headings. Multiple sources merge
left-to-right, with later sources overriding same-path files and folder config.

Options:
  -o, --out <file>      Write to <file> (default: stdout).
  -t, --title <text>    Emit <text> as a single H1 above everything.
  -l, --base-level <n>  Heading level of top-level sections
                        (default: 2 with --title, else 1).
  -h, --help            Show this help.
`;

type ParsedArgs =
  | { kind: "help" }
  | { kind: "compile"; options: CompileOptions; out?: string };

export function parseArgs(argv: string[]): ParsedArgs {
  const sources: string[] = [];
  let out: string | undefined;
  let title: string | undefined;
  let baseLevel: number | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        return { kind: "help" };
      case "-o":
      case "--out":
        out = expectValue(argv, ++i, arg);
        break;
      case "-t":
      case "--title":
        title = expectValue(argv, ++i, arg);
        break;
      case "-l":
      case "--base-level": {
        const value = Number(expectValue(argv, ++i, arg));
        if (!Number.isInteger(value) || value < 1 || value > 6) {
          throw new MdCompileError(`${arg} must be an integer between 1 and 6.`);
        }
        baseLevel = value;
        break;
      }
      default:
        if (arg !== undefined && arg.startsWith("-")) {
          throw new MdCompileError(`Unknown option: ${arg}`);
        }
        if (arg !== undefined) sources.push(arg);
    }
  }

  if (sources.length === 0) {
    throw new MdCompileError("No source directories given. See --help.");
  }
  return { kind: "compile", options: { sources, title, baseLevel }, out };
}

function expectValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (value === undefined) throw new MdCompileError(`${flag} needs a value.`);
  return value;
}

export function run(argv: string[], io: CliIo): number {
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(argv);
  } catch (error) {
    io.stderr.write(`${messageOf(error)}\n`);
    return 1;
  }

  if (parsed.kind === "help") {
    io.stdout.write(USAGE);
    return 0;
  }

  try {
    const output = compile(parsed.options);
    if (parsed.out) {
      mkdirSync(dirname(parsed.out), { recursive: true });
      writeFileSync(parsed.out, output);
    } else {
      io.stdout.write(output);
    }
    return 0;
  } catch (error) {
    io.stderr.write(`${messageOf(error)}\n`);
    return 1;
  }
}

function messageOf(error: unknown): string {
  if (error instanceof MdCompileError) return error.message;
  return error instanceof Error ? error.message : String(error);
}
