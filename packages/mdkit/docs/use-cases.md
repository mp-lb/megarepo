# Use Cases

MDKit is designed as independent layers. Use only the pieces your product
needs:

| Layers | Behavior |
| --- | --- |
| Editor only | Controlled markdown editor. No backend, checkpoints, or collaboration. |
| Editor + storage | Autosave, current-document reads/writes, and conflict handling. |
| Editor + storage + checkpoints | Autosave plus meaningful history and restore. |
| Editor + storage + collaboration | Live collaboration plus canonical markdown snapshots. |
| Full stack | Storage, checkpoints, restore, collaboration, and permissions. |

## Core Model

MDKit treats historical document state as checkpoint history.

A checkpoint is an immutable markdown snapshot with metadata. Version-per-write
is not a separate architecture; it is the checkpoint policy where every
successful write creates a checkpoint. No history is the checkpoint
policy where checkpoint creation is disabled.

That gives MDKit one history abstraction:

- autosave writes the canonical current markdown document
- checkpoint rules decide when current content becomes user-facing history
- history UI lists, previews, and restores checkpoints

## Checkpoint Policies

### Never

The app stores one current markdown document. The document still has an opaque
revision token for conflict detection, but no user-facing history.

### Always

Every successful write creates a checkpoint. This is useful for deliberate
manual-save products, but it is usually too noisy for autosave because
autosave writes can be tiny implementation details.

### Manual

Manual checkpoints are created by explicit user or product actions such as Save
checkpoint, publish, approve, or mark milestone.

### Smart

Autosave keeps the current document durable. A smart checkpoint policy decides
when a change is meaningful enough to become history. Practical policies use
values such as edit distance, elapsed time since the last checkpoint, author,
and write context.

```ts
const policy = CheckpointPolicy.smart({
  minEditDistance: 250,
  minIntervalMs: 5 * 60_000,
});
```

Use a custom function when the built-in policy is not enough:

```ts
const policy = CheckpointPolicy.function(
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

The function receives both computed values and raw document content, so products
can use mdkit's edit-distance calculation or compute their own comparison.

## Canonical Data

The canonical current document is markdown plus metadata:

- `documentId`
- `content`
- `revision`
- `updatedAt`
- optional caller-owned metadata

`revision` is an opaque concurrency token. It is not the same thing as a
checkpoint id.

Checkpoints are immutable markdown snapshots:

- `checkpointId`
- `documentId`
- `content`
- `createdAt`
- `sourceRevision`
- optional caller-owned metadata

The application owns product metadata, authorship, permissions, tenancy, and
audit data. MDKit should pass that data through without inspecting it.

## Restore

The safest restore flow preserves current work before replacing it:

- read the checkpoint being restored
- checkpoint the current document if it is not already represented
- update the canonical current document to the restored content
- create a new current revision
- reset collaboration state if collaboration is enabled

The restored checkpoint remains immutable. Products can choose whether restore
also creates a restore checkpoint at the top of history.

## Collaboration

Yjs state is the live collaboration state. Markdown remains the canonical
snapshot format for current-document storage and checkpoint history.

The opinionated collaboration flow is:

- seed an empty collaboration room from canonical markdown
- persist Yjs state through application-owned durable storage connected to the
  collaboration server
- snapshot active Yjs state to markdown before updating canonical storage or
  creating a checkpoint
- on restore, replace canonical markdown and reset/reseed collaboration state

Correctness is more important than preserving cursor continuity. A restore may
close or reset active collaboration sessions.

## API Direction

The current package already exposes the editor, storage hooks, checkpoint-list
hooks, base panels, tRPC/REST helpers, and markdown/Yjs conversion helpers.

Future backend helpers should add:

- checkpoint policy helpers for `never`, `always`, `smart`, and custom
  functions
- first-class checkpoint creation
- restore as a frontend/backend workflow
- generic metadata/context passthrough
- collaboration helpers for markdown/Yjs seeding, snapshotting, and reset
