# Styling

`MdKitEditor` can render without package CSS, but most applications should
import the stylesheet once. It gives the editor a reset-resistant markdown
baseline and exposes CSS variables for theme changes.

```ts
import "@mp-lb/mdkit/styles.css";
```

Without this stylesheet, the editor still works, but headings, lists,
blockquotes, code blocks, spacing, and focus areas are left to your app's CSS.

## CSS Resets

Many app frameworks include CSS resets. Tailwind Preflight, for example, removes
default margins and list styling. The package stylesheet restores markdown
editor defaults under `.mp-lb-mdkit-markdown-editor`, including:

- heading sizes and spacing
- paragraph spacing
- unordered and ordered list markers
- compact list item spacing
- inline code and code block styling
- blockquote styling
- link color
- full-width editor layout

Import the stylesheet after global reset styles when possible:

```ts
import "./app.css";
import "@mp-lb/mdkit/styles.css";
```

If your bundler or framework controls CSS order differently, make sure the
mdkit stylesheet is not overridden by a later broad reset such as
`ul { list-style: none; }`.

## Default Styling

The simplest setup is:

```tsx
import { MdKitEditor } from "@mp-lb/mdkit";
import "@mp-lb/mdkit/styles.css";

export function Editor({ markdown, setMarkdown }) {
  return <MdKitEditor value={markdown} onChange={setMarkdown} />;
}
```

The editor fills the available width by default. Use `fillHeight` only when you
want the editor to fill its parent's height, own its scroll area, and make the
empty area below the last line clickable.

```tsx
<MdKitEditor fillHeight value={markdown} onChange={setMarkdown} />
```

## Custom Styling

The package stylesheet is intentionally controlled through CSS variables. You
can override them with a class:

```css
.my-markdown-editor {
  --mp-lb-mdkit-background: #ffffff;
  --mp-lb-mdkit-foreground: #172033;
  --mp-lb-mdkit-muted: #eef1f4;
  --mp-lb-mdkit-muted-foreground: #5b6472;
  --mp-lb-mdkit-border: #d8dee8;
  --mp-lb-mdkit-link: #4f46e5;
  --mp-lb-mdkit-font-family: Inter, system-ui, sans-serif;
  --mp-lb-mdkit-font-size: 16px;
  --mp-lb-mdkit-line-height: 1.7;
  --mp-lb-mdkit-surface-padding: 1rem;
  --mp-lb-mdkit-block-gap: 0.75rem;
  --mp-lb-mdkit-list-item-gap: 0.125rem;
  --mp-lb-mdkit-code-background: #eef1f4;
  --mp-lb-mdkit-code-radius: 0.35rem;
  --mp-lb-mdkit-code-block-radius: 0.75rem;
}
```

```tsx
<MdKitEditor
  className="my-markdown-editor"
  value={markdown}
  onChange={setMarkdown}
/>
```

You can also pass variables through `style` when the values are generated at
runtime:

```tsx
<MdKitEditor
  style={{
    "--mp-lb-mdkit-font-family": "ui-serif, Georgia, serif",
    "--mp-lb-mdkit-font-size": "18px",
    "--mp-lb-mdkit-line-height": "1.8",
  }}
  value={markdown}
  onChange={setMarkdown}
/>
```

See [`MdKitEditorProps`](./api.md#mdkiteditorprops) for the full component
props.

## Class Hooks

The package uses stable `mp-lb-mdkit-*` class names for all package-owned
markup. These classes are a supported integration point for product-specific
styling. Prefer CSS variables for theme-level changes, and use class hooks when
you need structural changes, component-specific spacing, or state styling.

### Editor

`MdKitEditor` renders the markdown editing surface and the selection bubble
toolbar. The toolbar appears for non-empty text selections while the editor or
toolbar has focus. The search panel appears only when `search` is enabled and
the user opens it with the find keyboard shortcut.

- `.mp-lb-mdkit-markdown-editor`: root element rendered by `MdKitEditor`
- `.mp-lb-mdkit-markdown-editor-fill-height`: added to the root when
  `fillHeight` is enabled
- `.mp-lb-mdkit-editor-shell`: internal editor layout wrapper
- `.mp-lb-mdkit-editor-surface`: scroll and background surface around the
  ProseMirror editor
- `.mp-lb-mdkit-editor-empty`: loading or connecting placeholder
- `.mp-lb-mdkit-search-panel`: optional document search panel
- `.mp-lb-mdkit-search-input`: search text input
- `.mp-lb-mdkit-search-status`: search result count
- `.mp-lb-mdkit-search-button`: search navigation or close button
- `.mp-lb-mdkit-tiptap`: ProseMirror editable element
- `.mp-lb-mdkit-toolbar`: selection bubble toolbar
- `.mp-lb-mdkit-toolbar-button`: toolbar button
- `.mp-lb-mdkit-toolbar-button-active`: added to active toolbar buttons
- `.mp-lb-mdkit-toolbar-divider`: toolbar divider
- `.mp-lb-mdkit-collaboration-caret`: remote collaboration caret
- `.mp-lb-mdkit-collaboration-caret-label`: remote collaborator label

The editor root exposes `data-read-only="true"` when `readOnly` is enabled.

### Theme Editor

`MdKitThemeEditor` renders controls for editing a theme object.

- `.mp-lb-mdkit-theme-editor`: root element rendered by `MdKitThemeEditor`

### Document Toolbar

`MdKitDocumentToolbar` renders document save, restore, and conflict controls.

- `.mp-lb-mdkit-document-toolbar`: root element
- `.mp-lb-mdkit-document-toolbar-status`: status text group
- `.mp-lb-mdkit-document-toolbar-error`: non-conflict error message
- `.mp-lb-mdkit-document-toolbar-actions`: action button group
- `.mp-lb-mdkit-document-toolbar-conflict-trigger`: button that opens external
  conflict UI
- `.mp-lb-mdkit-document-toolbar-conflict`: inline conflict action row

The root exposes these state attributes:

- `data-conflict`: `"true"` when a document conflict exists
- `data-dirty`: `"true"` when local edits are unsaved
- `data-save-status`: raw save status from the document controller
- `data-status`: display status normalized for CSS selectors, such as
  `"saved"`, `"unsaved-changes"`, `"autosave-pending"`, or `"conflict"`

Example:

```css
.mp-lb-mdkit-document-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid var(--border);
  padding: 0.5rem 0;
}

.mp-lb-mdkit-document-toolbar-status,
.mp-lb-mdkit-document-toolbar-actions,
.mp-lb-mdkit-document-toolbar-conflict {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mp-lb-mdkit-document-toolbar[data-conflict="true"] {
  color: #991b1b;
}
```

### Conflict Panel

`MdKitConflictPanel` renders conflict details, previews, and conflict actions.

- `.mp-lb-mdkit-conflict-panel`: root element
- `.mp-lb-mdkit-conflict-panel-content`: title, explanatory text, and metadata
- `.mp-lb-mdkit-conflict-panel-error`: error text
- `.mp-lb-mdkit-conflict-panel-meta`: remote revision metadata
- `.mp-lb-mdkit-conflict-panel-preview`: preview area
- `.mp-lb-mdkit-conflict-panel-tabs`: preview tab list
- `.mp-lb-mdkit-conflict-panel-tab`: preview tab button
- `.mp-lb-mdkit-conflict-panel-tab-active`: active preview tab button
- `.mp-lb-mdkit-conflict-panel-action-row`: action button row
- `.mp-lb-mdkit-panel-secondary-action`: secondary panel action button

The preview tabs also use `aria-selected` for state-aware styling.

### Checkpoint History Panel

`VersionHistoryPanel` renders checkpoint history: a checkpoint list, selected
checkpoint preview, restore action, and empty/error states. The component and
CSS class names keep `version-history` for current API compatibility.

- `.mp-lb-mdkit-version-history-panel`: root element
- `.mp-lb-mdkit-version-history-header`: panel header
- `.mp-lb-mdkit-version-history-title`: panel title
- `.mp-lb-mdkit-version-history-subtitle`: panel subtitle
- `.mp-lb-mdkit-version-history-layout`: list and preview layout
- `.mp-lb-mdkit-version-history-list`: checkpoint list
- `.mp-lb-mdkit-version-history-item`: checkpoint list item button
- `.mp-lb-mdkit-version-history-item-active`: selected checkpoint list item
- `.mp-lb-mdkit-version-history-item-title`: list item title
- `.mp-lb-mdkit-version-history-item-meta`: list item or selected checkpoint metadata
- `.mp-lb-mdkit-version-history-preview`: selected checkpoint preview area
- `.mp-lb-mdkit-version-history-preview-header`: preview header
- `.mp-lb-mdkit-version-history-preview-title`: preview title
- `.mp-lb-mdkit-version-history-code`: markdown preview code block
- `.mp-lb-mdkit-version-history-empty`: empty state text
- `.mp-lb-mdkit-version-history-error`: error state text
- `.mp-lb-mdkit-version-history-meta`: footer metadata
- `.mp-lb-mdkit-panel-primary-action`: primary panel action button

### Shared Panel Actions

Conflict and checkpoint panels share generic action classes:

- `.mp-lb-mdkit-panel-primary-action`: primary action button
- `.mp-lb-mdkit-panel-secondary-action`: secondary action button

## CSS Variables

The package stylesheet defines variables on component roots so consumers can
override broad styling without depending on internal element structure.

### Editor Variables

Set these on `.mp-lb-mdkit-markdown-editor`, a custom `className` passed to
`MdKitEditor`, or the inline `style` prop:

- `--mp-lb-mdkit-background`
- `--mp-lb-mdkit-foreground`
- `--mp-lb-mdkit-muted`
- `--mp-lb-mdkit-muted-foreground`
- `--mp-lb-mdkit-border`
- `--mp-lb-mdkit-accent`
- `--mp-lb-mdkit-accent-foreground`
- `--mp-lb-mdkit-link`
- `--mp-lb-mdkit-font-family`
- `--mp-lb-mdkit-font-size`
- `--mp-lb-mdkit-line-height`
- `--mp-lb-mdkit-surface-padding`
- `--mp-lb-mdkit-block-gap`
- `--mp-lb-mdkit-list-item-gap`
- `--mp-lb-mdkit-heading-font-weight`
- `--mp-lb-mdkit-heading-1-size`
- `--mp-lb-mdkit-heading-2-size`
- `--mp-lb-mdkit-code-background`
- `--mp-lb-mdkit-code-radius`
- `--mp-lb-mdkit-code-block-radius`
- `--mp-lb-mdkit-code-font-family`
- `--mp-lb-mdkit-quote-border-color`

### Panel Variables

Set these on `.mp-lb-mdkit-document-toolbar`,
`.mp-lb-mdkit-conflict-panel`, `.mp-lb-mdkit-version-history-panel`, or a
wrapper around those components:

- `--mp-lb-mdkit-panel-background`
- `--mp-lb-mdkit-panel-surface`
- `--mp-lb-mdkit-panel-foreground`
- `--mp-lb-mdkit-panel-muted`
- `--mp-lb-mdkit-panel-muted-foreground`
- `--mp-lb-mdkit-panel-border`
- `--mp-lb-mdkit-panel-strong-border`
- `--mp-lb-mdkit-panel-danger`
- `--mp-lb-mdkit-panel-success`
- `--mp-lb-mdkit-panel-action-background`
- `--mp-lb-mdkit-panel-action-foreground`

## Theme Helpers

For app code, CSS variables are usually the simplest integration. The package
also exports theme helpers when you want to store or generate a theme object:

```tsx
import {
  MdKitEditor,
  createMdKitEditorThemeStyle,
  darkMdKitEditorTheme,
} from "@mp-lb/mdkit";

const style = createMdKitEditorThemeStyle({
  ...darkMdKitEditorTheme,
  fontFamily: "Inter, system-ui, sans-serif",
  lineHeight: "1.75",
});

<MdKitEditor style={style} value={markdown} onChange={setMarkdown} />;
```

Related exports are listed in the [API reference](./api.md#styling).

## Dark Mode

For class-based dark mode, scope variable overrides to your dark selector:

```css
.my-markdown-editor {
  --mp-lb-mdkit-background: #ffffff;
  --mp-lb-mdkit-foreground: #172033;
  --mp-lb-mdkit-muted: #eef1f4;
  --mp-lb-mdkit-muted-foreground: #5b6472;
  --mp-lb-mdkit-border: #d8dee8;
  --mp-lb-mdkit-link: #4f46e5;
  --mp-lb-mdkit-code-background: #eef1f4;
}

.dark .my-markdown-editor {
  --mp-lb-mdkit-background: #0b1220;
  --mp-lb-mdkit-foreground: #e5edf7;
  --mp-lb-mdkit-muted: #172033;
  --mp-lb-mdkit-muted-foreground: #94a3b8;
  --mp-lb-mdkit-border: #314158;
  --mp-lb-mdkit-link: #38bdf8;
  --mp-lb-mdkit-code-background: #111827;
}
```

Then apply the class normally:

```tsx
<MdKitEditor
  className="my-markdown-editor"
  value={markdown}
  onChange={setMarkdown}
/>
```

You can also switch theme objects in React:

```tsx
const style = createMdKitEditorThemeStyle(
  isDark ? darkMdKitEditorTheme : defaultMdKitEditorTheme,
);

<MdKitEditor style={style} value={markdown} onChange={setMarkdown} />;
```

## What Not To Customize First

Prefer changing CSS variables before overriding internal selectors like
`.mp-lb-mdkit-tiptap p` or `.mp-lb-mdkit-editor-surface`. Direct selector overrides are still an
escape hatch, but they couple your app to mdkit's internal DOM.

Use `MdKitThemeEditor` for theme builders, documentation, and debug tooling. It
is not required for normal editor integration.
