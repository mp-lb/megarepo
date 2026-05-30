# Quick Start

Markdown Editor Kit is a React package for teams that need more than a bare
markdown editor widget. It starts with a controlled markdown editor that behaves
like a textarea, then adds autosave, checkpoint history, conflict handling, and
collaboration through adapters.

Use the pieces you need. `MdKitEditor` works without any backend, storage,
checkpoint history, or collaboration. Persistence, checkpoint history, and
collaboration are optional layers that can be added independently.

```bash
pnpm add @mp-lb/mdkit
```

Import the stylesheet once if you want reset-resistant markdown defaults and
generic fallback styling for the base panels:

```ts
import "@mp-lb/mdkit/styles.css";
```

See [Styling](./styling.md) for reset handling, dark mode, fonts, sizing, and
custom panel styles.

## Basic Editor

`MdKitEditor` is the textarea-like entry point. It has no persistence, no
checkpoint history, and no collaboration. You own the `value` and `onChange`
state.

```tsx
import { useState } from "react";
import { MdKitEditor } from "@mp-lb/mdkit";
import "@mp-lb/mdkit/styles.css";

export function MarkdownEditorExample() {
  const [markdown, setMarkdown] = useState("# Hello markdown");
  return <MdKitEditor value={markdown} onChange={setMarkdown} />;
}
```

Use this when you want a local editor, a form field, or a debug surface.

## Read-only View

`MdKitView` renders markdown with the same package stylesheet, CSS variables,
and `fillHeight` sizing contract as `MdKitEditor`, but it does not mount Tiptap
or ProseMirror.

```tsx
import { MdKitView } from "@mp-lb/mdkit";
import "@mp-lb/mdkit/styles.css";

export function MarkdownPreview({ markdown }: { markdown: string }) {
  return <MdKitView fillHeight value={markdown} />;
}
```

Use this for document previews, restored-checkpoint views, or any readonly
markdown surface that should visually match the editor.

## Connected Editor

The connected workflow combines:

- `useMdKitDocument` for loading, autosave, dirty state, and conflict detection
- `useMdKitDocumentVersions` for checkpoint browsing and restore
- `useMdKitCollaboration` for Hocuspocus/Yjs collaboration
- `MdKitDocumentToolbar`, `VersionHistoryPanel`, and `MdKitConflictPanel` for
  a complete base-panel UI

The TypeScript-first path is tRPC. REST is also supported for high-compatibility
backends and non-TypeScript stacks.

### Frontend With tRPC

```tsx
import { useMemo, useState } from "react";
import {
  MdKitConflictPanel,
  MdKitDocumentToolbar,
  MdKitEditor,
  VersionHistoryPanel,
  useMdKitCollaboration,
  useMdKitDocument,
  useMdKitDocumentVersions,
  type MdKitDocumentVersionDetail,
} from "@mp-lb/mdkit";
import { createMdKitTrpcAdapter } from "@mp-lb/mdkit/trpc/client";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "./server";

const documentId = "docs/example.md";

export function ConnectedMarkdownEditor({
  apiUrl,
}: {
  apiUrl: string;
}) {
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);

  const trpc = useMemo(
    () =>
      createTRPCProxyClient<AppRouter>({
        links: [httpBatchLink({ url: `${apiUrl}/trpc` })],
      }),
    [apiUrl],
  );

  const adapter = useMemo(
    () => createMdKitTrpcAdapter({ client: trpc.mdkit }),
    [trpc],
  );
  const document = useMdKitDocument({
    adapter,
    debounceMs: 1000,
    documentId,
  });
  const versions = useMdKitDocumentVersions({ adapter, documentId });

  const collaboration = useMdKitCollaboration({
    collaborator: { id: "user-1", name: "Ada" },
    documentId,
    endpoint: `${apiUrl.replace(/^http/, "ws")}/collaboration`,
  });

  const restoreVersion = async (version: MdKitDocumentVersionDetail) => {
    await trpc.mdkit.restoreDocumentVersion.mutate({
      documentId,
      versionId: version.id,
    });

    await document.resync();
    await versions.refresh();
  };

  return (
    <>
      <MdKitDocumentToolbar
        collaboration={collaboration}
        document={document}
        versions={versions}
        onOpenConflict={() => setConflictOpen(true)}
        onOpenVersionHistory={() => setVersionHistoryOpen(true)}
      />

      <MdKitEditor
        collaboration={collaboration}
        fillHeight
        readOnly={document.conflict}
        value={document.value}
        onChange={document.setContent}
        onFocusChange={document.setFocused}
      />

      {versionHistoryOpen ? (
        <div role="dialog" aria-label="Version history">
          <VersionHistoryPanel
            controller={versions}
            onRestoreVersion={restoreVersion}
          />
        </div>
      ) : null}

      {document.conflict && conflictOpen ? (
        <div role="dialog" aria-label="Resolve conflict">
          <MdKitConflictPanel document={document} />
        </div>
      ) : null}
    </>
  );
}
```

The base panels are starter UI; if they do not fit your product, keep the hooks
and build your own workflow components.

### Backend Store Contract

The backend starts with a store object. Replace `createYourDocumentStore()` with
Postgres, MongoDB, Redis, files, or any other durable storage. Your store
implements the [`MdKitBackendStore`](./api.md#mdkitbackendstore) interface:
read/write the current document, create/read checkpoints, restore a checkpoint,
and optionally persist collaboration state.
The mdkit backend helper applies checkpoint policy and turns those primitives
into tRPC or REST procedures. Application-owned metadata, auth, permissions,
tenancy, and durable Yjs storage stay in your code; see
[Permissions](./permissions.md).

### Backend With tRPC

```ts
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { Database } from "@hocuspocus/extension-database";
import { Server } from "@hocuspocus/server";
import { WebSocketServer } from "ws";
import { CheckpointPolicy } from "@mp-lb/mdkit/core";
import { t } from "./trpc";
import {
  createMdKitBackend,
  type MdKitBackendStore,
} from "@mp-lb/mdkit/server";
import { createMdKitTrpcRouter } from "@mp-lb/mdkit/trpc/server";

const store: MdKitBackendStore = createYourDocumentStore();

const mdkit = createMdKitBackend({
  store,
  checkpointPolicy: CheckpointPolicy.smart(),
});

const collaboration = Server.configure({
  extensions: [
    new Database({
      fetch: ({ documentName }) => mdkit.readCollaborationState(documentName),
      store: ({ documentName, state }) =>
        mdkit.writeCollaborationState(documentName, state),
    }),
  ],
});

const appRouter = t.router({
  mdkit: createMdKitTrpcRouter(mdkit),
  // otherRouters: ...
});

export type AppRouter = typeof appRouter;

const server = createHTTPServer({
  basePath: "/trpc",
  router: appRouter,
});

const collaborationSockets = new WebSocketServer({ noServer: true });

collaborationSockets.on("connection", (socket, request) => {
  collaboration.handleConnection(socket, request, {});
});

server.on("upgrade", (request, socket, head) => {
  if (!request.url?.startsWith("/collaboration")) {
    socket.destroy();
    return;
  }

  collaborationSockets.handleUpgrade(request, socket, head, (websocket) => {
    collaborationSockets.emit("connection", websocket, request);
  });
});

server.listen(Number(process.env.PORT ?? 4312));
```

**Important:** if you enable collaboration, decide where Hocuspocus Yjs state is
stored; in-memory state is simple but does not scale across backend instances.
See [Collaboration Persistence](./collaboration-persistence.md).

If the frontend runs on a different origin, put this server behind your app's
dev proxy or add CORS handling around the tRPC handler. See
[API Reference](./api.md#transport-helpers) for the full backend helper API.

### REST

The quick start uses tRPC because it gives the connected editor a complete typed
backend surface. REST is supported, but it is more verbose: the frontend adapter
expects matching REST endpoints, and restore currently needs one explicit
request from your UI.

See [REST Backend](./rest.md) for the backend route shape and the small
frontend transport changes.

### Checkpoints

Checkpoint policies decide when saved content becomes history. The backend
example uses `CheckpointPolicy.smart()`, which applies mdkit's default
autosave-friendly policy. See [Checkpoint Policy](./api.md#checkpoint-policy)
for `never`, `always`, `smart`, and custom policy functions.

## Questions

### Do the backends need to know about each other?

Storage, checkpoint history, and collaboration can stay separate. Storage stores
the current markdown snapshot. Checkpoint history stores immutable markdown
snapshots. Hocuspocus hosts live Yjs collaboration state, and your application
chooses whether and where to persist that state. These pieces need glue when
your product wants collaborative edits to become canonical markdown or
checkpoints.

### Does mdkit require tRPC or these exact REST endpoints?

No. The frontend hooks only need an `MdKitDocumentAdapter`. You can use REST,
tRPC, GraphQL, server actions, IndexedDB, Rails, Go, or anything else as long as
your adapter returns the documented shapes.

### How do store callbacks access user or request context?

In the tRPC quick-start path, `createMdKitTrpcRouter(mdkit)` is the simple
version: create one mdkit backend around a store object, then mount the router.
Use that when the store can enforce permissions and write metadata without
per-request React editor context.

If your store methods need the authenticated user, organization, request id,
logger, or other trusted request state, create the store at your application
request boundary and close over that context:

```ts
const createStoreForRequest = (ctx: AppContext): MdKitBackendStore => ({
  readDocument: (documentId) =>
    files.readCurrentMarkdown({ documentId, user: ctx.user }),

  writeDocument: (input) =>
    files.writeCurrentMarkdown({
      ...input,
      actorId: ctx.user.id,
    }),

  createCheckpoint: (input) =>
    files.createMarkdownCheckpoint({
      ...input,
      actorId: ctx.user.id,
    }),
});
```

With tRPC, that means writing the mdkit procedures in your app router when you
need request-scoped behavior, and calling `createMdKitBackend({
store: createStoreForRequest(ctx), checkpointPolicy })` inside those
procedures. With REST, use the same pattern inside your route handlers after
you have authenticated the request. Mdkit does not need to understand your auth
model; it only needs store callbacks that can read, write, and checkpoint the
document.

### Do I have to use the base panels?

No. The base panels are the fastest way to get a complete workflow working in
any React app. If you want a fully custom UI, use `useMdKitDocument`,
`useMdKitDocumentVersions`, and `useMdKitCollaboration` directly and render your
own controls.
