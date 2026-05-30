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
| **shad** 🎨 | shadcn component registry + docs site | `apps/shad` | [docs/projects/shad](docs/projects/shad/PRODUCT.md) |

Published packages: `@mp-lb/mdkit`, `@mp-lb/zog`, `@mp-lb/paper`. Everything else
(`*-core/-server/-trpc`, the apps) is `private: true`.

## Repo layout

- `packages/*` — libraries and their private internal packages.
- `apps/*` — landing pages, docs sites, testbenches (all private).
- `docs/projects/<project>/` — one folder of product docs per project.
- `etc/` — shared tsconfig + vitest base configs.
- `infra/` — Terraform for the mdkit docs deploy (mdkit-specific for now).

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
4. **tsconfig**: node libraries extend `etc/tsconfig.lib.json`; node app packages
   extend `etc/tsconfig.node.json`; frontend/bundler packages extend
   `etc/tsconfig.base.json`.
5. **Product doc**: add `docs/projects/<slug>/PRODUCT.md` (what it is + a short
   story; mirror the existing ones — keep it brief).
6. **manifest**: add the slug to `manifest.json5` (`libs` for a published library,
   `apps` for an app-only project).
7. **changesets**: add every `private: true` package to the `ignore` list in
   `.changeset/config.json`.

That's it — match an existing project of the same shape and copy its conventions.

@AGENTS.local.md
