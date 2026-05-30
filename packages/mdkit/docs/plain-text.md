# Plain Text Editors

MDKit's connected workflow is not limited to `MdKitEditor`. The document hooks
and backend adapters work with serialized text, so you can bring a plain text,
code, JSON, or custom text editor and still use the same storage, autosave,
checkpoint history, restore, and conflict handling.

The one major exception is collaboration. Collaboration is currently a
markdown/Tiptap capability because it depends on Yjs, ProseMirror, and the
Tiptap collaboration extensions.

## What Works

Any editor can plug into the connected workflow if it behaves like a controlled
text input:

```tsx
type TextEditorProps = {
  value: string;
  onChange(value: string): void;
  onFocusChange?(focused: boolean): void;
  readOnly?: boolean;
};
```

That is enough for:

- loading the current document
- autosave
- dirty state
- conflict detection
- force save
- remote resync
- checkpoint history
- checkpoint restore

The editor does not need to know about MDKit internals. It only needs to receive
`document.value` and call `document.setContent`.

## Example

```tsx
import {
  MdKitConflictPanel,
  MdKitDocumentToolbar,
  VersionHistoryPanel,
  useMdKitDocument,
  useMdKitDocumentVersions,
  type MdKitDocumentAdapter,
} from "@mp-lb/mdkit";

function PlainTextDocument({
  adapter,
  documentId,
}: {
  adapter: MdKitDocumentAdapter;
  documentId: string;
}) {
  const document = useMdKitDocument({
    adapter,
    debounceMs: 1000,
    documentId,
  });
  const versions = useMdKitDocumentVersions({ adapter, documentId });

  return (
    <>
      <MdKitDocumentToolbar document={document} versions={versions} />

      <textarea
        readOnly={document.conflict}
        value={document.value}
        onBlur={() => document.setFocused(false)}
        onChange={(event) => document.setContent(event.currentTarget.value)}
        onFocus={() => document.setFocused(true)}
      />

      <MdKitConflictPanel document={document} />
      <VersionHistoryPanel controller={versions} />
    </>
  );
}
```

Use the same backend adapter you would use for markdown. The document content is
still just `content: string`.

## Backend Shape

You do not need a separate backend for plain text documents. A single MDKit
backend can expose:

- document read/write
- checkpoint list/read/restore
- optional collaboration websocket routes
- optional collaboration state persistence

Plain text editors use the document and checkpoint APIs. Markdown collaborative
editors additionally use the collaboration websocket and Yjs persistence.

The underlying database layout is application-owned. It is reasonable to store
markdown and plain text documents in the same documents table, or in separate
tables if your product needs that. MDKit only requires a stable `documentId`,
`content`, and an opaque revision token.

## Collaboration Boundary

Do not pass `useMdKitCollaboration` to a plain text editor. The current
collaboration adapter is for `MdKitEditor` because that editor knows how to bind
Tiptap to a Yjs document and render remote cursors.

For plain text documents:

- keep using `useMdKitDocument`
- omit `useMdKitCollaboration`
- omit collaboration UI
- rely on optimistic conflicts and resync for multi-client safety

If MDKit later adds a collaboration-capable CodeMirror, Monaco, or textarea
adapter, that should be a new editor-specific capability. The generic text
workflow does not need to change.

## Testbench

The testbench includes a connected stack named
`Storage + checkpoints (plain text)`. It reuses the same checkpoints backend as
the markdown stack, stores content under `docs/plain-text.txt`, and renders a
controlled textarea instead of `MdKitEditor`.

Use it to verify that plain text can autosave, create checkpoints, restore
history, and avoid collaboration UI.
