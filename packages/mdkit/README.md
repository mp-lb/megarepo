# `@mp-lb/mdkit`

Frontend primitives for document editing flows:

- `MdKitEditor` for a Markdown-first rich text surface with local and collaborative modes
- `useMdKitDocument` for autosave, conflict handling, and resync against a CRUD backend
- `MdKitDocumentToolbar` for unstyled connected-document workflow controls
- `useMdKitDocumentVersions` and `VersionHistoryPanel` for version browsing and restore flows
- `useMdKitCollaboration` for wiring the same editor into a Hocuspocus/Yjs session

## Install

```bash
pnpm add @mp-lb/mdkit
```

The editor behavior does not require package CSS. Import the optional stylesheet
when you want mdkit's reset-resistant markdown baseline and CSS-variable theme
system:

```ts
import "@mp-lb/mdkit/styles.css";
```

## Quick Start

```tsx
import { useState } from "react";
import { MdKitEditor } from "@mp-lb/mdkit";
import "@mp-lb/mdkit/styles.css";

export function MarkdownEditorExample() {
  const [markdown, setMarkdown] = useState("# Hello markdown");

  return <MdKitEditor value={markdown} onChange={setMarkdown} />;
}
```

`MdKitEditor` is the textarea-like entry point. It has no persistence,
version history, or collaboration. You own the `value` and `onChange` state.

## Exports

- `MdKitEditor`
- `MdKitDocumentToolbar`
- `useMdKitDocument`
- `useMdKitDocumentVersions`
- `useMdKitCollaboration`
- `MdKitThemeEditor`
- `VersionHistoryPanel`

The package also exports the related prop, adapter, document, versioning, and
collaboration types.

## Add Persistence

```tsx
import {
  MdKitDocumentToolbar,
  MdKitEditor,
  useMdKitDocument,
} from "@mp-lb/mdkit";

const document = useMdKitDocument({
  adapter,
  debounceMs: 1000,
  documentId: "docs/brief.md",
});

<>
  <MdKitDocumentToolbar document={document} />
  <MdKitEditor
    value={document.value}
    onChange={document.setContent}
    onFocusChange={document.setFocused}
  />
</>;
```

The storage adapter provides `readDocument`, `writeDocument`, and optional
`resyncDocument`.

## Version History

```tsx
import {
  VersionHistoryPanel,
  useMdKitDocumentVersions,
} from "@mp-lb/mdkit";

const versions = useMdKitDocumentVersions({
  adapter,
  documentId: "docs/brief.md",
});

<VersionHistoryPanel
  controller={versions}
  onRestoreVersion={async (version) => {
    document.setContent(version.content);
    await document.saveNow();
  }}
/>;
```

## Collaboration

```tsx
import {
  MdKitEditor,
  useMdKitCollaboration,
} from "@mp-lb/mdkit";

const collaboration = useMdKitCollaboration({
  collaborator: {
    id: "felix",
    name: "Felix",
  },
  documentId: "docs/brief.md",
  endpoint: "ws://127.0.0.1:1234",
});

<MdKitEditor collaboration={collaboration} />;
```

## Testbench

The workspace includes `apps/mdkit-testbench`, a Vite app for debugging the
package in unconnected and connected modes.

## Package Docs

Published library docs live in [`docs/index.md`](./docs/index.md). Internal
project notes live in the repository under [`../../docs/mdkit`](../../docs/mdkit).
