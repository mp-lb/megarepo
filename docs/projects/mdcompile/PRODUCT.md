# mdcompile 🧱

**Published as:** `@mp-lb/mdcompile` (exposes the `mdcompile` command).

Merge a folder tree of markdown into one document: **folders are headings, files
are body.** The directory tree owns the heading structure, so the content
fragments stay small and composable — and several source trees can be merged
together.

## The story

It was built to compile `AGENTS.md` from a shared base template plus
project-specific layers, so the same guidance doesn't get copy-pasted into every
repo. But it isn't tied to that use case — it's a generic markdown folder
compiler.

Mental model:

- A **folder** becomes a heading; its level is its depth in the tree. The heading
  text is the folder name kebab-case turned into a sentence
  (`process-management` → `Process management`), or an explicit override.
- A **file** contributes body content under the heading for its folder.
- Multiple source trees can be merged into a single output document.

## Layout in this repo

- `packages/mdcompile` — the published `@mp-lb/mdcompile` package + CLI. No
  external runtime dependencies (node builtins only).
