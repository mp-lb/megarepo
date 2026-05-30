# paper 🧾

**Published as:** `@mp-lb/paper` (exposes the `paper` command).

A CLI for generating boring business documents from simple structured input. The
first target document types are **invoice** and **resume**; the primary output is
PDF.

## The story

Plenty of small documents — invoices, resumes — are tedious to produce by hand but
trivially described as a little JSON payload. paper takes a small JSON-like payload
(from the command line or a file), validates it against a document-specific Zod
schema, rejects invalid input before rendering, and generates deterministic,
plain, professional documents.

## What it is *not*

Not a design tool, not a general-purpose HTML-to-PDF service, it does not execute
user-supplied templates, and it does not try to repair invalid input.

## Layout in this repo

- `packages/paper` — the published `@mp-lb/paper` package + CLI. Test snapshots
  live in `packages/paper/snapshots`.
- `apps/paper-docs` — Fumadocs documentation site.

> Note: an in-progress `schemas` export existed only in the old repo's working
> tree and was not carried into the consolidation — see `MIGRATION.md`.
