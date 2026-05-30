# REST Backend

Use REST when you want the quick-start frontend without tRPC. The editor,
toolbar, conflict panel, checkpoint panel, and collaboration hook are the same.
The difference is the backend transport.

If your backend uses Fastify, mdkit can register the REST routes for you. If you
use another server framework, implement the same endpoint shape shown below.

## Frontend Wiring

Use the connected frontend from the [Quick Start](./index.md#frontend-with-trpc).
Keep the same component structure, but change the transport-specific pieces:

- replace the tRPC adapter with `createMdKitRestAdapter`, using a REST base URL
  such as `${apiUrl}/mdkit`
- point collaboration at `${apiUrl.replace(/^http/, "ws")}/mdkit/collaboration`
- point the restore callback at `POST /mdkit/versions/:versionId/restore`

`createMdKitRestAdapter` covers current-document reads, writes, resync,
checkpoint listing, and checkpoint detail reads. Restore is separate because it
is not part of `MdKitDocumentAdapter` yet.

## Fastify Backend

```ts
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { Database } from "@hocuspocus/extension-database";
import { Server } from "@hocuspocus/server";
import Fastify from "fastify";
import { CheckpointPolicy } from "@mp-lb/mdkit/core";
import {
  createMdKitBackend,
  type MdKitBackendStore,
} from "@mp-lb/mdkit/server";
import { registerMdKitFastify } from "@mp-lb/mdkit/fastify";

const app = Fastify();
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

await app.register(cors, { origin: true });
await app.register(websocket);

await registerMdKitFastify(app, {
  prefix: "/mdkit",
  store: mdkit,
});

app.get("/mdkit/collaboration", { websocket: true }, (socket, request) => {
  collaboration.handleConnection(socket, request.raw, {});
});

app.addHook("onClose", async () => {
  await collaboration.destroy();
});

await app.listen({ port: Number(process.env.PORT ?? 4312) });
```

The store object is still your application boundary. It connects mdkit's REST
routes to your database and owns metadata, permissions, tenancy, and durable
Yjs storage. Mdkit applies the checkpoint policy and calls your store's
checkpoint creation method when needed. See
[`createMdKitBackend`](./api.md#createmdkitbackend).

## Endpoint Shape

If you are not using Fastify, implement these routes with your server framework:

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/mdkit/documents?documentId=...` | Read the current document. |
| `PUT` | `/mdkit/documents?documentId=...` | Write current content with `baseVersion`. |
| `POST` | `/mdkit/documents/resync?documentId=...` | Force a fresh current-document read. |
| `GET` | `/mdkit/versions?documentId=...` | List checkpoints as `{ versions }`. |
| `GET` | `/mdkit/versions/:versionId?documentId=...` | Read one checkpoint. |
| `POST` | `/mdkit/versions/:versionId/restore?documentId=...` | Restore one checkpoint. |

The REST frontend adapter expects the same JSON shapes as
`MdKitDocumentAdapter`. Write conflicts should return the conflict body with
HTTP `409`; the adapter treats that as a successful mdkit response so the editor
can show the conflict workflow.
