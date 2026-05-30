# mdkit 📝

**Published as:** `@mp-lb/mdkit` · **Landing page:** https://mdkit.mp-lb.dev/

A toolkit for building integrated, feature-rich markdown editor experiences —
the editor shell, document/version controllers, collaboration session types, and
the server/tRPC plumbing to wire it into an app.

## The story

Markdown editing shows up again and again across our apps, and each time it drags
in the same supporting cast: an editor component, a document controller, version
history, optional real-time collaboration, and a server contract to persist it.
mdkit packages that once so a product can drop in a working markdown editor
instead of rebuilding the shell.

## Layout in this repo

- `packages/mdkit` — the published `@mp-lb/mdkit` library (entry, `./core`,
  `./server`, `./trpc`, `./yjs`, `./styles.css`). Its VitePress landing page lives
  in `packages/mdkit/docs`.
- `packages/mdkit-core` / `-server` / `-trpc` — private internal packages
  (browser-safe code, Node server infra, the tRPC router).
- `apps/mdkit-frontend` / `-backend` — reference frontend/backend.
- `apps/mdkit-testbench` / `-testbench-backend` — a harness for exercising the
  editor.

## Consumers

`shad` (in-repo), `bondwf`, `doctrine`, `linnea`.
