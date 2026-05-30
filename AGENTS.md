# megarepo 🧰

A pnpm + turbo monorepo that hosts the `@mp-lb` shared **libraries** and the
component registry. Each library used to live in its own repo (with its own
landing page and docs); they were consolidated here so there's one place to
standardize tooling and share code. See `MIGRATION.md` for how that merge went.

## The projects

Every project has a short product doc under **`docs/projects/<project>/`** — read
it first when you start work on that project.

| Project | What it is | Code | Docs |
| --- | --- | --- | --- |
| **mdkit** 📝 | Markdown editor toolkit (`@mp-lb/mdkit`) | `packages/mdkit` (+ `mdkit-core/-server/-trpc`), `apps/mdkit-*` | [docs/projects/mdkit](docs/projects/mdkit/PRODUCT.md) |
| **zog** 🐸 | Zod-first MongoDB persistence layer (`@mp-lb/zog`) | `packages/zog` (+ `zog-core/-server/-trpc`), `apps/zog-docs` | [docs/projects/zog](docs/projects/zog/PRODUCT.md) |
| **paper** 🧾 | CLI that renders documents from JSON (`@mp-lb/paper`) | `packages/paper`, `apps/paper-docs` | [docs/projects/paper](docs/projects/paper/PRODUCT.md) |
| **mdcompile** 🧱 | Merge a markdown folder tree into one doc (`@mp-lb/mdcompile`) | `packages/mdcompile` | [docs/projects/mdcompile](docs/projects/mdcompile/PRODUCT.md) |
| **shad** 🎨 | shadcn component registry + docs site | `apps/shad` | [docs/projects/shad](docs/projects/shad/PRODUCT.md) |

Published packages: `@mp-lb/mdkit`, `@mp-lb/zog`, `@mp-lb/paper`. Everything else
(`*-core/-server/-trpc`, the apps) is `private: true`.

## Repo layout

- `packages/*` — libraries and their private internal packages.
- `apps/*` — landing pages, docs sites, testbenches (all private).
- `docs/projects/<project>/` — one folder of product docs per project.
- `etc/` — shared tsconfig + vitest base configs.
- `infra/<project>/` — per-project infra (currently just `infra/mdkit/`, the
  Terraform for mdkit's docs deploy). The repo root carries **no** project-specific
  runtime deps — each package declares its own.

## Commands

```bash
pnpm install
pnpm build       # turbo build
pnpm typecheck   # turbo typecheck
pnpm test        # turbo test
pnpm lint        # eslint .
```

Changesets drive publishing; only the three published packages release. Private
packages are listed in `.changeset/config.json` `ignore`.

## Adding a new project

Keep it consistent with what's already here — the naming scheme is the whole
point, so a new project should be mechanical to add:

1. **Pick a slug** (lowercase, no scope), e.g. `widget`.
2. **Library package** → `packages/<slug>`, published as `@mp-lb/<slug>`.
   - Internal/private sub-packages → `packages/<slug>-<role>` named
     `@mp-lb/<slug>-<role>` (e.g. `widget-core`, `widget-server`), `private: true`.
   - **Always prefix folders with the slug.** Two projects may both want a
     `core`/`server`/`docs` folder; the slug prefix is what keeps them from
     colliding. Folder names are free (npm doesn't care) — the `name` field is
     what's published, so the prefix lives on the folder.
3. **Apps** (landing page, docs site, testbench) → `apps/<slug>-docs`,
   `apps/<slug>-frontend`, etc., named `@mp-lb/<slug>-docs`, all `private: true`.
4. **package.json shape:**
   - A **published** package: `private` omitted/false; `main`/`types`/`exports`
     pointing at `dist`; `files: ["dist", "package.json", "README.md"]`; a `bin`
     if it's a CLI; scripts `build` / `typecheck` / `test`; and
     `publishConfig: { "access": "public" }` — **just `access`, no explicit
     `registry`** (it's the npm default and is set by CI).
   - **Do not invent a `license`.** The repo's license is still an open decision
     (see `MIGRATION.md`); leave it to that decision rather than dropping `MIT`
     into a new package ad hoc.
   - A **private** package: `"private": true` and nothing publish-related.
   - Pin deps exactly (the repo uses `save-exact`); don't add a runtime dep to the
     repo root — declare it in the package that imports it.
5. **tsconfig**: node libraries extend `etc/tsconfig.lib.json`; node app packages
   extend `etc/tsconfig.node.json`; frontend/bundler packages extend
   `etc/tsconfig.base.json`. Tests run on vitest (`environment: "node"` for node
   packages).
6. **Product doc**: add `docs/projects/<slug>/PRODUCT.md` (what it is + a short
   story; mirror the existing ones — keep it brief).
7. **manifest**: add the slug to `manifest.json5` (`libs` for a published library,
   `apps` for an app-only project).
8. **changesets / releasing:**
   - Add every `private: true` package to the `ignore` list in
     `.changeset/config.json`. Do **not** add published packages to `ignore`.
   - A published package only releases when there's a changeset for it — run
     `pnpm changeset` and commit the generated file. A new package with no
     changeset will never publish.
9. **Verify from the root** before you're done: `pnpm install` then
   `pnpm build && pnpm typecheck && pnpm test` (turbo runs the whole workspace).

> These steps exist because they're easy to miss. A package added without this
> guide (`mdcompile`) built fine but had skipped 4, 6, 7, and 8 — it wasn't in the
> manifest, had no product doc, no changeset (so it'd never publish), declared a
> license the repo hasn't agreed on, and over-specified `publishConfig`. Match an
> existing project of the same shape and walk this list.

@AGENTS.local.md
