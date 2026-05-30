# megarepo consolidation — migration notes & reference inventory

This repo is the consolidation of four formerly-standalone repos into one pnpm +
turbo monorepo:

- `mp-lb/mdkit` → `packages/mdkit` (+ internal packages, testbench/landing apps)
- `mp-lb/zog`   → `packages/zog` (+ internal packages, docs app)
- `mp-lb/paper` → `packages/paper` (+ docs app)
- `mp-lb/shad`  → `apps/shad` (Next.js registry/docs site)

Imported as a **clean import of each repo's committed `HEAD`** (no git history
carried over — history stays in the originals). Built on **mdkit's structure and
conventions** (turbo, shared `etc/` tsconfigs, flat eslint, changesets, TS 6,
vitest 4).

## Structural changes

- **Directory collisions resolved by prefixing.** mdkit and zog both had
  `packages/{core,server,trpc}`; zog and paper both had `apps/docs`. Folders were
  renamed with a library prefix (`mdkit-core`, `zog-core`, `zog-docs`,
  `paper-docs`, …). **Published package `name` fields are unchanged** — npm
  consumers are unaffected.
- **Scope unified to `@mp-lb`.** mdkit's internal packages were `@fssstack/mdkit-*`
  (all `private: true`, never published); renamed to `@mp-lb/mdkit-*`. Safe
  because none are published. The three published names — `@mp-lb/mdkit`,
  `@mp-lb/zog`, `@mp-lb/paper` — are untouched.
- **Doctrine intentionally excluded.** Each source repo's root `docs/`,
  `doctrine.yaml`, and `.doctrine/` were **not** imported. The three projects each
  had their own Doctrine store synced to `docs/`, which cannot coexist at one repo
  root. Wiring this up is the job of the follow-up library-docs standardization
  migration. (shad had no Doctrine.)

## Tooling convergence

- Single `package.json` (turbo scripts), `pnpm@11.1.3`, TypeScript `6.0.3`,
  vitest `4.1.5`, one `.changeset/config.json` (merged `ignore` lists).
- `etc/tsconfig.lib.json` (new) holds zog/paper's node-library base (NodeNext,
  declaration + maps) — they used to extend a same-named `etc/tsconfig.base.json`
  that meant something different from mdkit's frontend base. mdkit node packages
  keep using `etc/tsconfig.node.json`.
- **Single React copy.** The merged apps pinned both `19.2.0` and `19.2.6`, which
  split React into two physical copies and broke `@testing-library` (null hooks
  dispatcher). `pnpm-workspace.yaml` `overrides` pins `react`/`react-dom` to
  `19.2.6`.
- **Fumadocs aligned.** shad's `@fumadocs/base-ui` floated to `16.9.3` while
  `fumadocs-core` is pinned to `16.8.12` by the docs apps; shad is pinned to
  `@fumadocs/base-ui@16.8.12` to match.
- Build-script approvals (`allowBuilds`): esbuild, msw, playwright,
  `@tailwindcss/oxide`, sharp.

## Verification (on branch `rfw/consolidate-libraries`)

| Check | Result |
| --- | --- |
| `pnpm build` | ✅ 15/15 packages |
| `pnpm typecheck` | ✅ 16/16 |
| `pnpm test` | ✅ 14/14 (mdkit 85, zog 58, paper 17, …) |
| `pnpm lint` | ⚠️ runs (eslint config bug fixed), but the imported code is not yet lint/format-clean — see below |
| `npm pack` parity | ✅ `@mp-lb/mdkit` & `@mp-lb/zog` tarball file sets **identical** to originals; `@mp-lb/paper` identical except the uncommitted `schemas` feature (see below) |

---

## Reference inventory (for the requester — fixups are OUT OF SCOPE here)

### Unaffected — keyed on npm package name, not git location

npm consumers import by package name, which did not change, so **no consumer code
needs editing**:

- `@mp-lb/mdkit` → consumed by `shad` (now in-repo via `workspace:*`), `bondwf`,
  `doctrine`, `linnea`
- `@mp-lb/zog` → consumed by `doctrine`
- `@mp-lb/paper` → no internal consumers detected

### Must be updated — keyed on git location

1. **Git remotes / clone URLs.** `github.com/mp-lb/{mdkit,zog,paper,shad}` are
   superseded by `github.com/mp-lb/megarepo`. Anything cloning the old repos
   (scripts, bookmarks, CI checkouts elsewhere).
2. **Hardcoded local paths.** `~/Code/{mdkit,zog,paper,shad}` → `~/Code/megarepo`
   (e.g. dash/zap configs, the manager's `projects.md`).
3. **`zog-og/package.json`** contains a reference to the old zog git URL — the
   only in-tree git-location reference found across `~/Code`.
4. **CI / deploy config (per-repo, now needs monorepo paths):**
   - mdkit docs deploy (`.github/workflows/deploy-docs.yml`, carried over)
     uses Terraform + Vercel with `PROJECT_NAME=mdkit` and TF state prefix
     `terraform/state/mdkit`. Still points at `packages/mdkit/**` (valid), but the
     Vercel/Cloudflare project + GitHub secrets now live under the megarepo repo.
   - zog / paper docs sites deployed via **Vercel git integration** (each had a
     `vercel.json`, no GH workflow). Their Vercel projects must be repointed at
     `apps/zog-docs` / `apps/paper-docs` as the root directory.
   - shad deployed via Vercel (`vercel.json`: `pnpm build`); repoint root dir to
     `apps/shad`.
5. **Doctrine stores.** `felixsebastian/{mdkit,zog,paper}` stores + their
   `doctrine.yaml` sync rules were left behind. The library-docs migration must
   decide how docs are synced in the merged repo (one store w/ references, or
   per-package subpaths). Doctrine stores are addressed by `<workspace>/<slug>`,
   **not** git location, so the stores themselves are intact — only the local
   wiring moved.

---

## Flagged — decisions left to the requester (NOT done here)

- **LICENSE.** No repo had a license (`license=none`) → "public" today means
  source-visible, not OSS. Note a discrepancy: `packages/zog/package.json` already
  declares `"license": "MIT"` while no LICENSE file exists. Pick & add `LICENSE`
  file(s) when flipping public.
- **Visibility.** megarepo stays **PRIVATE**. Flip to PUBLIC after review.
- **Archiving old repos (recommended, confirm first).** Once publishing + docs
  deploys move here, archive `mp-lb/{mdkit,zog,paper,shad}` read-only with a
  pointer to megarepo. **Do not delete.**
- **Lint/format cleanup.** The eslint *config* bug (a `react/jsx-newline` rule in
  a config object missing the `react` plugin — pre-existing, made `eslint .` crash
  in standalone mdkit too) is fixed. But the imported code was never actually
  lint/format-clean (mdkit's config never ran; zog/paper/shad had no eslint).
  `pnpm lint` now reports ~11k issues, ~10.3k auto-fixable formatting
  (`prettier/prettier`, padding) + ~770 real (`no-unused-*`, `import/extensions`,
  `react-hooks/*`). Recommend a dedicated `eslint --fix` + cleanup pass as part of
  the standardization follow-up. `apps/shad/**` is currently excluded from eslint
  (its full Next app graph OOMs typed-linting; it never had eslint).
- **paper's uncommitted `schemas` feature.** paper's working tree had an
  uncommitted `src/schemas.ts` + `./schemas` export. Per the committed-HEAD-only
  import it was **left behind**. Commit it in the old repo first if it should ship,
  then port.
- **CI reconciliation.** A single changeset-driven `release.yml` now covers all
  three publishable packages (with paper's `playwright install` + verify). mdkit's
  bespoke per-push **prerelease** `publish.yml` (`-main.N` versions) was **not**
  ported — restore it generalized if continuous prereleases are still wanted.
- **`@mp-lb/cli-docs`.** Not created here; the structure is ready to host it later.
