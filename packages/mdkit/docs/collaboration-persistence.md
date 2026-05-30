# Collaboration Persistence

`useMdKitCollaboration` connects `MdKitEditor` to Hocuspocus/Yjs. Mdkit handles
the editor integration and markdown/Yjs conversion helpers, but your application
owns where collaboration state is stored.

## What Needs To Be Stored

Hocuspocus collaboration state is Yjs binary state for one collaborative
document. Store it as bytes in your database or object storage. Good fits
include Postgres `bytea`, MongoDB `Binary`, S3/blob storage, or another durable
store your backend already uses.

You can keep this state in memory for a single-process app. That is simple and
can be acceptable for small deployments, but it has important limits:

- a server restart loses open collaboration state unless it was flushed
  elsewhere
- multiple backend instances do not share memory
- collaborators can split across different instances unless your deployment
  adds sticky routing, shared persistence, or Hocuspocus infrastructure for
  multi-instance collaboration

## Document Names Are Stable IDs

Hocuspocus calls the collaboration key `documentName`. Treat that value as a
stable unique document identifier, not as a mutable display name. It can be a
document UUID, file id, or deterministic tenant/document key such as
`tenantId:documentId`.

On the client, mdkit passes `documentId` to Hocuspocus as the provider `name` by
default. If your collaboration key needs tenancy or another namespace, derive it
with `resolveRoomName`:

```tsx
const collaboration = useMdKitCollaboration({
  collaborator: { id: user.id, name: user.name },
  documentId,
  endpoint: `${apiUrl.replace(/^http/, "ws")}/collaboration`,
  getToken,
  resolveRoomName: (documentId) => `${tenantId}:${documentId}`,
});
```

The same resolved value is what Hocuspocus passes to its persistence callbacks
as `documentName`.

## Database Extension

The usual integration is Hocuspocus' generic `Database` extension. Put your DB
reads and writes inside `fetch` and `store`.

```ts
import { Database } from "@hocuspocus/extension-database";
import { Server } from "@hocuspocus/server";
import { CheckpointPolicy } from "@mp-lb/mdkit/core";
import {
  createMdKitBackend,
  type MdKitBackendStore,
} from "@mp-lb/mdkit/server";

const mdkit = createMdKitBackend({
  store: createYourDocumentStore(),
  checkpointPolicy: CheckpointPolicy.smart(),
});

const collaboration = Server.configure({
  extensions: [
    new Database({
      fetch: async ({ documentName }) => {
        // Hocuspocus calls this documentName, but it should be a stable id.
        return mdkit.readCollaborationState?.(documentName) ?? null;
      },

      store: async ({ documentName, state }) => {
        await mdkit.writeCollaborationState?.(documentName, state);
      },
    }),
  ],
});
```

Your document store can back those mdkit methods with any database:

```ts
const createYourDocumentStore = (): MdKitBackendStore => ({
  // Current markdown snapshot.
  readDocument: (documentId) => db.documents.readCurrent(documentId),
  writeDocument: (input) => db.documents.writeCurrent(input),

  // Optional checkpoint history.
  createCheckpoint: (input) => db.checkpoints.create(input),
  getLatestCheckpoint: (documentId) => db.checkpoints.latest(documentId),
  listDocumentVersions: (documentId) => db.checkpoints.list(documentId),
  readDocumentVersion: (input) => db.checkpoints.read(input),

  // Durable Yjs collaboration state.
  readCollaborationState: async (documentName) => {
    const row = await db.collaborationState.findByDocumentName(documentName);
    return row?.yjsState ?? null;
  },

  writeCollaborationState: async (documentName, state) => {
    await db.collaborationState.upsert({
      documentName,
      yjsState: state,
      updatedAt: new Date().toISOString(),
    });
  },
});
```

Store the `state` bytes exactly as Hocuspocus gives them to you, and return the
same bytes from `fetch`. Do not convert the Yjs state to JSON and rebuild it on
every connection; that creates new Yjs identities and can duplicate content when
clients reconnect.

## Seeding From Markdown

The simplest flow is:

1. Current markdown lives in your normal document table.
2. Hocuspocus asks for Yjs state in `fetch`.
3. If persisted Yjs state exists, return it.
4. If no persisted Yjs state exists, seed the collaboration room from the
   current markdown snapshot.
5. After that first seed, persist and reuse the Yjs state.

Mdkit exposes Yjs helpers for that seed/reset work:

```ts
import { yjs } from "@mp-lb/mdkit";

const state = existingState ?? yjs.markdownToMdKitYjs(currentMarkdown);
```

If your app supports restore, import, or external full-document replacement,
replace or reset the persisted collaboration state deliberately so the next
collaboration session starts from the restored canonical markdown.

## Hocuspocus Docs

For the Hocuspocus side of the setup, see:

- [Hocuspocus Database extension](https://tiptap.dev/docs/hocuspocus/server/extensions/database)
- [Hocuspocus persistence guide](https://tiptap.dev/docs/hocuspocus/guides/persistence)
- [Hocuspocus Redis extension](https://tiptap.dev/docs/hocuspocus/server/extensions/redis)
