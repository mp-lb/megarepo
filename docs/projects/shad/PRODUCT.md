# shad 🎨

**Landing page:** https://shad.mp-lb.dev/

The shadcn-style **component registry** for MP-LB components, plus its docs site.
Distributable components (a markdown editor shell for `@mp-lb/mdkit`, a JSON
viewer, a structured log viewer) are published as a registry that other projects
install with `shadcn add`.

## The story

We keep reusing the same handful of React components across apps. shad turns them
into a proper shadcn registry: each component is authored once under `registry/`,
built into installable JSON, and documented on a Fumadocs/Next.js site. Consumers
pull them in directly:

```bash
pnpm dlx shadcn@latest add https://shad.mp-lb.dev/r/structured-log-viewer.json
```

## Layout in this repo

- `apps/shad` — the whole project: the Next.js docs site (`app/`, `components/`,
  `content/`), the component sources under `registry/`, and `registry.json`. The
  `registry:build` script compiles the registry into `public/r/`.

## Internal deps

Consumes `@mp-lb/mdkit` (in-repo, via `workspace:*`).
