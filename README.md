# megarepo

Monorepo for the `@mp-lb` shared libraries: **mdkit**, **zog**, and **paper**,
consolidated from their former standalone repos. See [MIGRATION.md](MIGRATION.md)
for what moved, what changed, and the reference inventory for downstream fixups.

```bash
pnpm install
pnpm build && pnpm typecheck && pnpm test && pnpm lint
```

Published packages: `@mp-lb/mdkit`, `@mp-lb/zog`, `@mp-lb/paper`.
