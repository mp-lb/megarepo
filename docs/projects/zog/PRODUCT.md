# zog 🐸

**Published as:** `@mp-lb/zog` · **Landing page:** https://zog.mp-lb.dev/

A tiny Zod-first persistence layer for MongoDB. Not an ORM — it keeps MongoDB's
native document model and driver API, while making the storage boundary explicit
enough that application code keeps using ordinary Zod-validated domain objects.

## The story

In our projects Zod schemas are already the source of truth for domain records,
and MongoDB fits because records are already documents. But the same persistence
details leak into every repository: domain code uses `id` while MongoDB uses
`_id`; reads need to parse untrusted stored data back through Zod; writes need
parsing before they become durable; filters/updates/projections need `id`
translated; indexes need a stable home. Doctrine had exactly this pattern inline
in `createMongoDomainCollection`. Zog is the reusable version of that code.

On writes it parses input, moves the configured primary key to `_id`, and stops
MongoDB inventing accidental ObjectIds for app-owned records. On reads it maps
`_id` back, applies optional legacy normalization, and parses through the schema.
It gives indexes a home (`ensureIndexes`/`diffIndexes`/`syncIndexes`) and exposes
`raw` for advanced operations.

## What it is *not*

No entity classes, decorators, identity maps, unit of work, lazy loading, relation
modeling, change tracking, query builders, or migrations.

## Layout in this repo

- `packages/zog` — the published `@mp-lb/zog` library.
- `packages/zog-core` / `-server` / `-trpc` — private internal packages.
- `apps/zog-docs` — Fumadocs documentation site.

## Consumers

`doctrine`.
