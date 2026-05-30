# Architecture

The editor package should keep UI concerns separate from persistence,
checkpoint history, permissions, and collaboration infrastructure.

## Layers

### Editor

`MdKitEditor` is the public editor component.

For local editing, it accepts:

- `value: string`
- `onChange?: (markdown: string) => void`
- `onFocusChange?: (focused: boolean) => void`
- `instanceKey?: string | number`

It should behave like a fancy textarea from the consumer's point of view. It
must not know about storage, checkpoints, auth, servers, Hocuspocus, MongoDB,
or the host application.

For collaborative editing, the same component accepts:

- `collaboration: MdKitCollaborationSession`
- `value?: string`
- `onChange?: (markdown: string) => void`
- `onFocusChange?: (focused: boolean) => void`

Collaboration needs a different editor engine internally because it is backed by
Yjs state and remote cursors, but consumers should not need a separate editor
component.

In collaborative mode, Yjs is the live content source. The editor must not apply
late React `value` updates into the collaborative document because a host app may
load the durable markdown snapshot after Hocuspocus has already hydrated the
same document. Applying that snapshot as editor content can duplicate blocks in
the shared CRDT state.

`MdKitView` is the read-only companion surface. It accepts a markdown `value`
and uses the same package styling and full-height layout contract as
`MdKitEditor`, but it renders markdown without Tiptap or ProseMirror. Use it
when consumers need previews, checkpoint snapshots, or readonly document views
that visually match the editor without paying the editor runtime cost.

### Headless Hooks

Storage, checkpoint history, and collaboration controls should come from hooks and
consumer-owned UI. A product can render those controls in a header, toolbar,
side panel, command menu, or nowhere at all.

Hooks should expose enough state for consumers to decide which UI features are
visible based on available adapters:

- storage adapter present: load/save UI and autosave can exist
- checkpoint adapter present: checkpoint history UI can exist
- collaboration adapter present: collaborative state and presence can exist

Missing adapters should remove functionality, not break the editor.

### Reference Integrations

Reference integrations should provide plug-and-play adapters for supported
backends. The editor UI should depend on adapter interfaces, not implementation
details.

Examples:

- JSON document storage
- MongoDB-backed document storage
- JSON or MongoDB checkpoint history
- Hocuspocus/Yjs collaboration

### Backend Helpers

The opinionated backend helper should provide structure, not own application
data. Applications still own storage, metadata, auth, permissions, tenancy, and
infrastructure. MDKit should own the workflow shape: current-document writes,
checkpoint policy, restore ordering, collaboration authorization hooks, and
markdown/Yjs bridging.

## Ownership Rule

The frontend editor owns rendering and local editing state. Adapters own
durable state and transport. The editor should never import database clients,
server framework code, or backend-specific SDKs.

## Package Boundaries

Packages should expose:

- pure types for adapter contracts
- React hooks/components for UI behavior
- optional adapter factories in separate entrypoints when we add reference integrations

Reference adapters should be optional dependencies or split entrypoints so a basic consumer does not install server-only or backend-specific code.
