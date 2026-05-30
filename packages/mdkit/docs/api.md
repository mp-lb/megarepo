# API Reference

This page lists the current public exports from
`@mp-lb/mdkit`. It is hand-written for now; a generated API
reference from JSDoc/TypeScript declarations is a good follow-up once the public
surface settles.

## Editor

### `MdKitEditor`

Primary editor component.

Local mode:

```tsx
<MdKitEditor value={markdown} onChange={setMarkdown} />
```

Collaborative mode:

```tsx
<MdKitEditor collaboration={collaboration} />
```

In collaborative mode the Yjs document in `collaboration.document` is the editor
content source. `value` may be passed for API symmetry with connected examples,
but external `value` changes are not applied into the collaborative document.
Use your Hocuspocus/MDKit collaboration persistence bridge to seed or replace
collaborative content.

### `MdKitEditorProps`

Props for `MdKitEditor`.

Local editing props:

- `value: string`
- `onChange?: (markdown: string) => void`
- `onFocusChange?: (focused: boolean) => void`
- `fillHeight?: boolean`
- `search?: boolean`
- `instanceKey?: string | number`
- `className?: string`
- `style?: CSSProperties`

Collaborative editing props:

- `collaboration: MdKitCollaborationSession`
- `value?: string`
- `onChange?: (markdown: string) => void`
- `onFocusChange?: (focused: boolean) => void`
- `fillHeight?: boolean`
- `search?: boolean`
- `className?: string`
- `style?: CSSProperties`

`fillHeight` makes the editor fill its parent height, own its scroll area, and
keep blank space below the last line clickable so it focuses the cursor at the
end. Leave it off when the host application owns sizing and scrolling.

`search` opts the editor into the built-in document search panel. The panel is
not rendered by default; when enabled, users open it with `Cmd+F` on macOS or
`Ctrl+F` on Windows/Linux.

The package stylesheet includes reset-resistant markdown rules for headings,
lists, code blocks, blockquotes, and links. Styling is controlled with CSS
variables on `.mp-lb-mdkit-markdown-editor`. See [Styling](./styling.md) for setup,
dark mode, fonts, sizing, and theme customization.

### `MdKitView`

Read-only markdown view that uses the same shell, sizing, and markdown styling
as `MdKitEditor`, but renders with `react-markdown` instead of Tiptap.

```tsx
<MdKitView value={markdown} />
<MdKitView fillHeight value={markdown} />
```

Props:

- `value: string`
- `placeholder?: string`
- `fillHeight?: boolean`
- `className?: string`
- `style?: CSSProperties`

`fillHeight` uses the same full-pane sizing contract as `MdKitEditor`.

## Document Persistence

### `useMdKitDocument`

Hook for loading, editing, saving, autosaving, and resyncing a markdown document
through a storage adapter.

### `MdKitDocumentController`

Return type for `useMdKitDocument`. It contains the current markdown value,
status flags, save actions, resync actions, conflict details, and state setters
used by editor UI.

### `MdKitDocumentToolbar`

Unstyled workflow controls for a connected markdown document. Render this above
or near `MdKitEditor` when you want mdkit to handle common document actions
without adopting a design system.

```tsx
<MdKitDocumentToolbar
  document={document}
  versions={versions}
  collaboration={collaboration}
  onOpenConflict={() => setConflictDialogOpen(true)}
  onOpenVersionHistory={() => setVersionPanelOpen(true)}
/>
```

It renders save status, collaboration status, an optional checkpoint-history
entry point labelled with the current revision token, and a conflict entry via
`onOpenConflict`.

Related type:

- `MdKitDocumentToolbarProps`

### `MdKitConflictPanel`

Base panel for conflict resolution. It renders inline semantic HTML, previews the
remote and local content snapshots, and uses the document controller actions to
keep the remote document or keep the local editor content.

```tsx
<MdKitConflictPanel document={document} />
```

It returns `null` when `document.conflict` is false. Use it next to
`MdKitDocumentToolbar` when you want the base-panel workflow. If your app uses a
modal, drawer, or editor-replacement view, put this panel inside your own shell.

Related type:

- `MdKitConflictPanelProps`

### `MdKitDocumentAdapter`

Storage adapter contract. Implement this to connect document persistence to your
backend.

```ts
type MdKitDocumentAdapter = {
  readDocument(documentId: string): Promise<MdKitDocumentSnapshot>;
  writeDocument(
    input: MdKitDocumentWriteInput,
  ): Promise<MdKitDocumentWriteResult>;
  resyncDocument?(documentId: string): Promise<MdKitDocumentSnapshot>;
  listDocumentVersions?(
    documentId: string,
  ): Promise<MdKitDocumentVersionSummary[]>;
  readDocumentVersion?(input: {
    documentId: string;
    versionId: string;
  }): Promise<MdKitDocumentVersionDetail | null>;
};
```

Required storage methods:

- `readDocument` returns the current markdown snapshot.
- `writeDocument` persists markdown with the caller's base version.
- `resyncDocument` is optional and can force a fresh read from the canonical
  source.

Optional checkpoint-history methods:

- `listDocumentVersions` returns available checkpoints for the document.
- `readDocumentVersion` returns a saved markdown snapshot for one checkpoint.

The current public names still use `Version` because that is the existing API.
Conceptually these records are checkpoints. `MdKitDocumentSnapshot.version` is
an opaque current-document revision token, not necessarily a user-facing
checkpoint id.

Related storage types:

- `MdKitDocumentSnapshot`
- `MdKitDocumentWriteInput`
- `MdKitDocumentWriteResult`

```ts
type MdKitDocumentSnapshot = {
  content: string;
  version: MdKitDocumentVersionToken;
  updatedAt?: string | null;
};

type MdKitDocumentWriteInput = {
  documentId: string;
  content: string;
  baseVersion: MdKitDocumentVersionToken;
};

type MdKitDocumentWriteResult =
  | {
      version: MdKitDocumentVersionToken;
      updatedAt?: string | null;
    }
  | {
      conflict: true;
      version?: MdKitDocumentVersionToken;
      updatedAt?: string | null;
    };
```

## Styling

### `MdKitThemeEditor`

Reusable controls for editing an `MdKitEditorTheme`. This component is optional
and mainly intended for theme builders, documentation, and debug tools.

```tsx
const [theme, setTheme] = useState(darkMdKitEditorTheme);
const style = createMdKitEditorThemeStyle(theme);

<MdKitThemeEditor theme={theme} onChange={setTheme} />
<MdKitEditor style={style} value={markdown} onChange={setMarkdown} />
```

Related exports:

- `MdKitEditorTheme`
- `MdKitEditorThemeStyle`
- `createMdKitEditorThemeStyle`
- `defaultMdKitEditorTheme`
- `darkMdKitEditorTheme`

`MdKitThemeEditor` also relies on the optional package stylesheet for its own
layout. Without that stylesheet, it still renders normal form controls.

## Checkpoint History

### `useMdKitDocumentVersions`

Hook for listing checkpoints, reading a checkpoint detail, and tracking
checkpoint-history loading state.

### `VersionHistoryPanel`

UI component for rendering checkpoint history from `useMdKitDocumentVersions`.

Related types:

- `MdKitDocumentVersionSummary`
- `MdKitDocumentVersionDetail`
- `MdKitDocumentVersionToken`
- `MdKitDocumentVersionsController`
- `UseMdKitDocumentVersionsOptions`
- `VersionHistoryPanelProps`

```ts
type MdKitDocumentVersionToken = string | number | null;

type MdKitDocumentVersionSummary = {
  id: string;
  label?: string;
  createdAt: string;
  authorLabel?: string | null;
  version?: MdKitDocumentVersionToken;
};

type MdKitDocumentVersionDetail = MdKitDocumentVersionSummary & {
  content: string;
};
```

The `Version` type names are retained for compatibility with the current public
API. The data model should be understood as checkpoint history.

### `CheckpointPolicy`

Backend helper for deciding when saved content should become checkpoint
history. Pass the policy to mdkit's backend helper, not to your application
store. Your store exposes database operations; mdkit evaluates the policy after
writes and calls your checkpoint storage when the policy triggers.

```ts
import { CheckpointPolicy } from "@mp-lb/mdkit/core";

const never = CheckpointPolicy.never();
const always = CheckpointPolicy.always();
const smart = CheckpointPolicy.smart();
const tunedSmart = CheckpointPolicy.smart({
  minEditDistance: 250,
  minIntervalMs: 5 * 60_000,
});

const custom = CheckpointPolicy.function(
  ({
    currentContent,
    editDistance,
    previousCheckpointContent,
    timeSinceLastCheckpointMs,
  }) =>
    editDistance > 500 ||
    timeSinceLastCheckpointMs > 10 * 60_000 ||
    currentContent.startsWith("# Published") !==
      previousCheckpointContent?.startsWith("# Published"),
);
```

`smart()` without options uses mdkit's default autosave-friendly policy.
`function()` receives both mdkit's computed edit distance and the raw document
content, so products can use the built-in comparison or replace it with their
own.

### `createMdKitBackend`

Creates the mdkit backend surface from your application store and checkpoint
policy. This is the layer that owns checkpoint orchestration.

```ts
import { CheckpointPolicy } from "@mp-lb/mdkit/core";
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

const router = createMdKitTrpcRouter(mdkit);
```

On a document write, the helper should:

- write the canonical current document
- compare the current content with the latest checkpoint
- evaluate the configured `CheckpointPolicy`
- call the store's checkpoint creation method when the policy triggers
- return the write result to the transport layer

Exported from `@mp-lb/mdkit/server`.

### `MdKitBackendStore`

Application-owned persistence contract consumed by `createMdKitBackend`.
Implement this with your database. The checkpoint policy is not interpreted by
this store; mdkit calls `createCheckpoint` when the configured policy triggers.

```ts
type MdKitBackendStore = {
  readDocument(documentId: string): Promise<MdKitDocumentSnapshot>;
  writeDocument(
    input: MdKitDocumentWriteInput,
  ): Promise<MdKitDocumentWriteResult>;
  getLatestCheckpoint?(
    documentId: string,
  ): Promise<MdKitDocumentVersionDetail | null>;
  createCheckpoint?(input: {
    documentId: string;
    content: string;
    sourceRevision: MdKitDocumentVersionToken;
    metadata?: unknown;
  }): Promise<MdKitDocumentVersionSummary>;
  listDocumentVersions?(
    documentId: string,
  ): Promise<MdKitDocumentVersionSummary[]>;
  readDocumentVersion?(input: {
    documentId: string;
    versionId: string;
  }): Promise<MdKitDocumentVersionDetail | null>;
  restoreDocumentVersion?(input: {
    documentId: string;
    versionId: string;
  }): Promise<MdKitDocumentWriteResult>;
  readCollaborationState?(documentName: string): Promise<Uint8Array | null>;
  writeCollaborationState?(
    documentName: string,
    state: Uint8Array,
  ): Promise<void>;
};
```

## Collaboration

### `useMdKitCollaboration`

Hook for creating a Hocuspocus/Yjs collaboration session for `MdKitEditor`.

Related types:

- `MdKitCollaborationParticipant`
- `MdKitCollaborationSession`
- `MdKitCollaborationStatus`

```ts
type MdKitCollaborationSession = {
  collaborator: MdKitCollaborationParticipant;
  document: Y.Doc;
  provider: HocuspocusProvider | null;
  roomName: string;
  status: MdKitCollaborationStatus;
};
```

## Transport Helpers

### `createMdKitRestAdapter`

Creates an `MdKitDocumentAdapter` that talks to the mdkit REST endpoint shape.
Restore is not part of `MdKitDocumentAdapter` yet, so REST restore needs a
separate `POST /versions/:versionId/restore` call from application code. See
[REST Backend](./rest.md).

```ts
const adapter = createMdKitRestAdapter({
  baseUrl: "https://api.example.com/mdkit",
});
```

Exported from `@mp-lb/mdkit`.

### `registerMdKitFastify`

Registers the matching REST endpoints on a Fastify app.

```ts
await registerMdKitFastify(app, {
  prefix: "/mdkit",
  store: mdkit,
});
```

Exported from `@mp-lb/mdkit/fastify`.

### `createMdKitTrpcRouter`

Creates a tRPC router for document reads, writes, resync, checkpoint list/read,
and restore. The current API names still use `Version`, but these methods model
checkpoint history.

```ts
const appRouter = t.router({
  mdkit: createMdKitTrpcRouter(mdkit),
  // otherRouters: ...
});

const server = createHTTPServer({
  basePath: "/trpc",
  router: appRouter,
});
```

Exported from `@mp-lb/mdkit/trpc/server`.

### `createMdKitTrpcClient` and `createMdKitTrpcAdapter`

Creates a typed tRPC client and turns it into an `MdKitDocumentAdapter`.

```ts
const client = createMdKitTrpcClient({ url: `${apiUrl}/trpc` });
const adapter = createMdKitTrpcAdapter({ client });
```

If the mdkit router is nested inside your app router, create your normal app
client and pass the mdkit sub-client:

```ts
const adapter = createMdKitTrpcAdapter({ client: trpc.mdkit });
```

Exported from `@mp-lb/mdkit/trpc/client`.

### `MdKitTransportStore`

Transport-ready backend surface used by the Fastify and tRPC helpers. You can
implement this directly for full control, but the opinionated path is to create
it with `createMdKitBackend({ store, checkpointPolicy })` so mdkit owns
checkpoint policy orchestration.

```ts
type MdKitTransportStore = {
  readDocument(documentId: string): Promise<MdKitDocumentSnapshot>;
  writeDocument(
    input: MdKitDocumentWriteInput,
  ): Promise<MdKitDocumentWriteResult>;
  resyncDocument?(documentId: string): Promise<MdKitDocumentSnapshot>;
  listDocumentVersions?(
    documentId: string,
  ): Promise<MdKitDocumentVersionSummary[]>;
  readDocumentVersion?(input: {
    documentId: string;
    versionId: string;
  }): Promise<MdKitDocumentVersionDetail | null>;
  restoreDocumentVersion?(input: {
    documentId: string;
    versionId: string;
  }): Promise<MdKitDocumentWriteResult>;
  readCollaborationState?(documentName: string): Promise<Uint8Array | null>;
  writeCollaborationState?(
    documentName: string,
    state: Uint8Array,
  ): Promise<void>;
};
```
