# @mp-lb/mdcompile

Merge folders of markdown into one document. **Folders are headings; files are
body.** The directory tree owns the heading structure, so the content fragments
stay small and composable — and several source trees can be merged together.

This was built to compile `AGENTS.md` from a shared base template plus
project-specific layers, but it is not tied to that: it is a generic markdown
folder compiler.

## Mental model

- A **folder** becomes a heading. Its level is its depth in the tree.
- The heading text is the folder name, kebab-case turned into a sentence
  (`process-management` → `Process management`), or an explicit override.
- **Files** inside a folder are its body, concatenated in order. Files may
  contain anything **except headings** — code blocks, lists, quotes, tables are
  all fine. A heading in a file is an error, because headings come from folders.
- **Sub-folders** become sub-sections (deeper headings).
- Multiple source trees **merge left-to-right**: a later source replaces a
  same-path file and overrides folder config; same-named folders merge.

## Usage

```bash
mdcompile <source...> [options]

  -o, --out <file>      Write to <file> (default: stdout).
  -t, --title <text>    Emit <text> as a single H1 above everything.
  -l, --base-level <n>  Heading level of top-level sections
                        (default: 2 with --title, else 1).
```

Compile an `AGENTS.md` from a base template plus a project's layers:

```bash
mdcompile base-template docs/agents-md --title mgr -o AGENTS.md
```

## Ordering

Within a folder, files render before sub-folders. Control order with a numeric
prefix on the name (`01-`, `02-`) — the prefix is stripped from the heading. The
prefix sorts numerically and is dropped from the derived name.

## `mdcompile.json`

Drop an `mdcompile.json` in any folder to override its heading or child order:

```json
{
  "title": "tRPC",
  "order": ["overview", "mutations"]
}
```

`order` lists children by their derived name (no prefix, no extension). Listed
children come first in that order; the rest follow in default order.

## Library API

```ts
import { compile } from "@mp-lb/mdcompile";

const markdown = compile({
  sources: ["base-template", "docs/agents-md"],
  title: "mgr",
});
```
