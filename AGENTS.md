# megarepo

A pnpm + turbo monorepo hosting the `@mp-lb` shared libraries. Consolidated from
the former standalone `mdkit`, `zog`, and `paper` repos (see `MIGRATION.md`).

## Layout

- `packages/*` — libraries. Publishable: `@mp-lb/mdkit`, `@mp-lb/zog`,
  `@mp-lb/paper`. The rest (`mdkit-core`/`-server`/`-trpc`, `zog-core`/`-server`/
  `-trpc`) are private internal packages.
- `apps/*` — landing pages and testbenches (`mdkit-frontend`/`-backend`,
  `mdkit-testbench*`, `zog-docs`, `paper-docs`). All private.
- `etc/` — shared tsconfig and vitest base configs.
- `infra/` — Terraform for the mdkit docs deploy (mdkit-specific for now).

## Conventions

- Directory names carry a library prefix (e.g. `packages/mdkit-core`) so the three
  libraries' formerly-colliding folders (`core`/`server`/`trpc`/`docs`) coexist.
  **Published package `name` fields must never change** — consumers import by name.
- Tooling baseline is mdkit's: turbo, shared `etc/` tsconfigs, flat eslint config,
  TypeScript 6, vitest 4, changesets for releases.

## Commands

```bash
pnpm install
pnpm build      # turbo build
pnpm typecheck  # turbo typecheck
pnpm test       # turbo test
pnpm lint       # eslint .
```

## Releasing

Changesets drive publishing. Internal/private packages are in the `ignore` list in
`.changeset/config.json`. Only `@mp-lb/{mdkit,zog,paper}` publish to npm.

@AGENTS.local.md
