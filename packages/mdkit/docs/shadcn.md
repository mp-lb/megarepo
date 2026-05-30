# Shadcn Plugin

The core npm package is design-system agnostic. It exports the editor, hooks,
base panels, types, and generic CSS. It does not export shadcn components at
runtime.

The shadcn path should be a registry/plugin item. Installing it copies editable
source into your app, and that source imports your app's own shadcn primitives:

```tsx
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
```

That means the workflow component can own polished app UI: toolbar, checkpoint
history dialog, conflict dialog, tabs, buttons, and layout. The underlying state
still comes from the mdkit hooks. The recommended transport for this path is
the tRPC adapter from `@mp-lb/mdkit/trpc/client`.

## Intended Shape

The installed component should be one app-local workflow component that you
render next to `MdKitEditor`.

```tsx
import {
  MdKitEditor,
  useMdKitCollaboration,
  useMdKitDocument,
  useMdKitDocumentVersions,
} from "@mp-lb/mdkit";
import {
  createMdKitTrpcAdapter,
  createMdKitTrpcClient,
} from "@mp-lb/mdkit/trpc/client";
import { MdKitConnectedWorkflow } from "@/components/mdkit/mdkit-connected-workflow";

export function EditorScreen() {
  const client = createMdKitTrpcClient({ url: "/trpc" });
  const adapter = createMdKitTrpcAdapter({ client });
  const document = useMdKitDocument({
    adapter,
    debounceMs: 1000,
    documentId,
  });
  const versions = useMdKitDocumentVersions({ adapter, documentId });

  const collaboration = useMdKitCollaboration({
    collaborator,
    documentId,
    endpoint: hocuspocusEndpoint,
  });

  const restoreVersion = async (version) => {
    await client.restoreDocumentVersion.mutate({
      documentId,
      versionId: version.id,
    });

    await document.resync();
    await versions.refresh();
  };

  return (
    <MdKitConnectedWorkflow
      collaboration={collaboration}
      document={document}
      versions={versions}
      onRestoreVersion={restoreVersion}
    >
      <MdKitEditor
        collaboration={collaboration}
        readOnly={document.conflict}
        value={document.value}
        onChange={document.setContent}
        onFocusChange={document.setFocused}
      />
    </MdKitConnectedWorkflow>
  );
}
```

The shadcn component is deliberately source-installed instead of imported from
the npm package. That is how shadcn is designed to work: the code lives in your
app, uses your aliases, and can be edited like any other local component.

## Why Not A Runtime Export?

mdkit should not:

- bundle copies of shadcn primitives
- depend on shadcn as a package
- ask you to pass a map of local `Button`, `Dialog`, or `Tabs` components into
  mdkit
- ship Tailwind-only wrappers from the npm package and hope your build scans
  external package source

The npm package stays focused on the durable logic. The registry item owns the
app-local shadcn composition.

## Fallback Path

If you do not use shadcn, use the base panels from the npm package:

- `MdKitDocumentToolbar`
- `VersionHistoryPanel`
- `MdKitConflictPanel`

They render plain semantic HTML with stable `mp-lb-mdkit-*` classes. Import
`@mp-lb/mdkit/styles.css` for generic fallback styling, or
replace the CSS entirely. See [Styling](./styling.md#component-styling).

## Status

The mdkit testbench currently contains the reference shadcn workflow component.
It is the target shape for the future registry/plugin item. Until that registry
item exists, treat the base panels as the supported published path.
