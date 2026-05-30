import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BookOpen,
  Database,
  Download,
  Eye,
  GitBranch,
  RotateCcw,
  TerminalSquare,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
import {
  createMdKitEditorThemeStyle,
  defaultMdKitEditorTheme,
  MdKitConflictPanel,
  MdKitDocumentToolbar,
  MdKitEditor,
  MdKitThemeEditor,
  MdKitView,
  VersionHistoryPanel,
  useMdKitCollaboration,
  useMdKitDocument,
  useMdKitDocumentVersions,
  type MdKitCollaborationParticipant,
  type MdKitDocumentVersionDetail,
  type MdKitEditorTheme,
  type MdKitEditorThemeStyle,
} from "@mp-lb/mdkit";
import { createMdKitTrpcAdapter } from "@mp-lb/mdkit/trpc/client";
import type { MdKitTrpcClient } from "@mp-lb/mdkit/trpc/client";
import { replaceMdKitYjsMarkdown } from "@mp-lb/mdkit/yjs";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type {
  AppRouter,
  TestbenchStackId,
} from "../../mdkit-testbench-backend/src/app";
import { Badge } from "./components/ui/badge";
import {
  MdKitConnectedEditor,
  MdKitEditorChrome,
} from "./components/mdkit-editor";
import { Button } from "./components/ui/button";
import { Checkbox } from "./components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Textarea } from "./components/ui/textarea";

(
  globalThis as typeof globalThis & { __MDKIT_COLLAB_DEBUG__?: boolean }
).__MDKIT_COLLAB_DEBUG__ = true;

const storageKey = "mdkit-testbench:basic-markdown";
const docsUrl = import.meta.env.VITE_DOCS_URL;
const apiUrl = import.meta.env.VITE_TESTBENCH_API_URL;
const connectedDocumentId = "docs/example.md";
const plainTextConnectedDocumentId = "docs/plain-text.txt";

const sampleMarkdown = `---
title: mdkit testbench
tags: ["front matter", "manual qa"]
---

# mdkit testbench

This editor is wired like a textarea:

- \`value\` comes from React state
- \`onChange\` writes the next markdown string
- persistence is a single mock storage slot
- no versions, autosave, or collaboration

Whitespace probe:


There should be two blank lines above this paragraph in the raw textarea.

Edit either pane and the other one should stay in sync.`;

const readOnlySampleMarkdown = `---
title: Read-only view
mode: preview
---

# Read-only view

This pane renders markdown without mounting Tiptap or ProseMirror.

- Uses the same mdkit shell and markdown styling
- Supports the same \`fillHeight\` sizing mode
- Keeps links opening in a new tab: [mdkit docs](https://example.com)

| Feature | Expected |
| --- | --- |
| Tables | Render with borders |
| GFM | Enabled |

> Use the State tab to type arbitrary markdown and inspect rendering.`;

type ConnectedVariant = "base" | "shadcn";
type ActiveTab = "connected" | "read-only" | "unconnected";
type ConnectedEditorKind = "markdown" | "plain-text";
type ConnectedStackOptionId = TestbenchStackId | "plain-text-checkpoints";

type TestbenchRoute = {
  connectedVariant: ConnectedVariant;
  initialStackId: ConnectedStackOptionId;
  initialTab: ActiveTab;
  qaMode: boolean;
};

type InspectorTab = {
  content: ReactNode;
  id: string;
  label: string;
};

type StoredMarkdown = {
  markdown: string;
  storedAt: string;
};

const createDefaultCollaborator = (): MdKitCollaborationParticipant => {
  const suffix = Math.random().toString(36).slice(2, 8);

  return {
    color: `#${Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, "0")}`,
    id: `testbench-${suffix}`,
    name: `Testbench ${suffix.toUpperCase()}`,
  };
};

type MdKitTestbenchTrpcClient = MdKitTrpcClient & {
  restoreDocumentVersion: {
    mutate(input: {
      documentId: string;
      versionId: string;
    }): Promise<unknown>;
  };
};

const statusBadgeClass = {
  danger: "border-red-200 bg-red-50 text-red-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
} as const;

const connectedStacks = [
  {
    backendStackId: "storage",
    description: "Current document reads, writes, autosave, and conflicts.",
    editorKind: "markdown",
    hasCheckpoints: false,
    hasCollaboration: false,
    id: "storage",
    label: "Storage",
  },
  {
    backendStackId: "checkpoints",
    description: "Storage plus smart checkpoint history and restore.",
    editorKind: "markdown",
    hasCheckpoints: true,
    hasCollaboration: false,
    id: "checkpoints",
    label: "Storage + checkpoints",
  },
  {
    backendStackId: "checkpoints",
    description: "Plain text editor using the same storage and checkpoints.",
    editorKind: "plain-text",
    hasCheckpoints: true,
    hasCollaboration: false,
    id: "plain-text-checkpoints",
    label: "Storage + checkpoints (plain text)",
  },
  {
    backendStackId: "collaboration",
    description: "Storage plus a Hocuspocus/Yjs collaboration room.",
    editorKind: "markdown",
    hasCheckpoints: false,
    hasCollaboration: true,
    id: "collaboration",
    label: "Storage + collaboration",
  },
  {
    backendStackId: "full",
    description: "Storage, smart checkpoints, restore, and collaboration.",
    editorKind: "markdown",
    hasCheckpoints: true,
    hasCollaboration: true,
    id: "full",
    label: "Full stack",
  },
] as const satisfies readonly {
  backendStackId: TestbenchStackId;
  description: string;
  editorKind: ConnectedEditorKind;
  hasCheckpoints: boolean;
  hasCollaboration: boolean;
  id: ConnectedStackOptionId;
  label: string;
}[];

const connectedStackById = Object.fromEntries(
  connectedStacks.map((stack) => [stack.id, stack]),
) as Record<ConnectedStackOptionId, (typeof connectedStacks)[number]>;

const countWords = (value: string) =>
  value.trim() ? value.trim().split(/\s+/).length : 0;

const readTestbenchRoute = (): TestbenchRoute => {
  const route = window.location.pathname.replace(/\/+$/, "");

  if (route === "/qa-unconnected") {
    return {
      connectedVariant: "base",
      initialStackId: "full",
      initialTab: "unconnected",
      qaMode: true,
    };
  }

  if (route === "/qa-read-only") {
    return {
      connectedVariant: "base",
      initialStackId: "full",
      initialTab: "read-only",
      qaMode: true,
    };
  }

  if (route === "/qa-connected-base" || route === "/qa-connected") {
    return {
      connectedVariant: "base",
      initialStackId: "full",
      initialTab: "connected",
      qaMode: true,
    };
  }

  if (route === "/qa-connected-shadcn") {
    return {
      connectedVariant: "shadcn",
      initialStackId: "full",
      initialTab: "connected",
      qaMode: true,
    };
  }

  return {
    connectedVariant: "base",
    initialStackId: "full",
    initialTab: "connected",
    qaMode: false,
  };
};

const readStoredMarkdown = (): StoredMarkdown | null => {
  const raw = window.localStorage.getItem(storageKey);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredMarkdown>;

    if (typeof parsed.markdown !== "string") {
      return null;
    }

    return {
      markdown: parsed.markdown,
      storedAt:
        typeof parsed.storedAt === "string"
          ? parsed.storedAt
          : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
};

const formatStoredAt = (storedAt: string) =>
  new Date(storedAt).toLocaleString();

const trpcUrl = () => `${apiUrl}/trpc`;

const collaborationEndpoint = (stackId: TestbenchStackId) => {
  if (!apiUrl) {
    return null;
  }

  return `${apiUrl.replace(/^http/, "ws")}/collaboration/${stackId}`;
};

const MarkdownStatePanel = ({
  focusedPane,
  label = "Markdown State",
  markdown,
  onBlur,
  onChange,
  onFocus,
  storageMatchesMemory,
}: {
  focusedPane?: string | null;
  label?: string;
  markdown: string;
  onBlur?: () => void;
  onChange: (markdown: string) => void;
  onFocus?: () => void;
  storageMatchesMemory?: boolean | null;
}) => {
  const [draft, setDraft] = useState(markdown);
  const isEditing = focusedPane === "textarea";
  const textareaValue = isEditing ? draft : markdown;

  useEffect(() => {
    if (!isEditing) {
      setDraft(markdown);
    }
  }, [isEditing, markdown]);

  const stats = useMemo(
    () => ({
      characters: textareaValue.length,
      lines: textareaValue.split("\n").length,
      words: countWords(textareaValue),
    }),
    [textareaValue],
  );

  return (
    <section className="testbench-config-section testbench-state-panel">
      <h2>{label}</h2>
      <div className="testbench-status" aria-label="Markdown stats">
        <Badge>{stats.characters} chars</Badge>
        <Badge>{stats.words} words</Badge>
        <Badge>{stats.lines} lines</Badge>
        {storageMatchesMemory == null ? null : (
          <Badge
            variant="outline"
            className={
              storageMatchesMemory
                ? statusBadgeClass.success
                : statusBadgeClass.warning
            }
          >
            {storageMatchesMemory ? "matches stored" : "differs from stored"}
          </Badge>
        )}
        {focusedPane ? <Badge>{focusedPane} focused</Badge> : null}
      </div>
      <Textarea
        spellCheck={false}
        value={textareaValue}
        onBlur={onBlur}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          onChange(next);
        }}
        onFocus={() => {
          setDraft(markdown);
          onFocus?.();
        }}
      />
    </section>
  );
};

const Inspector = ({
  activeTab,
  onActiveTabChange,
  tabs,
}: {
  activeTab?: string;
  onActiveTabChange?: (tab: string) => void;
  tabs: InspectorTab[];
}) => {
  if (!tabs[0]) {
    return null;
  }

  return (
    <aside className="testbench-inspector">
      <div className="testbench-inspector-header">
        <h2>Inspector</h2>
      </div>
      <Tabs
        defaultValue={tabs[0].id}
        value={activeTab}
        onValueChange={onActiveTabChange}
        className="testbench-inspector-tabs"
      >
        <TabsList className="testbench-inspector-tabs-list">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className="testbench-inspector-panel"
          >
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </aside>
  );
};

const ConnectedSidebar = ({
  activeInspectorTab,
  inspectorTabs,
  onActiveInspectorTabChange,
  onStackChange,
  stackId,
}: {
  activeInspectorTab?: string;
  inspectorTabs: InspectorTab[];
  onActiveInspectorTabChange?: (tab: string) => void;
  onStackChange: (stackId: ConnectedStackOptionId) => void;
  stackId: ConnectedStackOptionId;
}) => (
  <aside className="testbench-sidebar">
    <ConnectedStackCard
      stackId={stackId}
      onStackChange={onStackChange}
    />
    <Inspector
      activeTab={activeInspectorTab}
      tabs={inspectorTabs}
      onActiveTabChange={onActiveInspectorTabChange}
    />
  </aside>
);

const BehaviorPanel = ({
  fillHeight,
  onFillHeightChange,
}: {
  fillHeight: boolean;
  onFillHeightChange: (fillHeight: boolean) => void;
}) => (
  <section className="testbench-config-section">
    <h2>Behavior</h2>
    <label className="testbench-checkbox-row">
      <Checkbox
        checked={fillHeight}
        onCheckedChange={(checked) => onFillHeightChange(checked === true)}
      />
      <span>
        <strong>Fill available height</strong>
        <small>
          Expands the editor surface and enables the empty-area hitbox.
        </small>
      </span>
    </label>
  </section>
);

const ConnectedShellPanel = ({
  connectedVariant,
  onVariantChange,
}: {
  connectedVariant: ConnectedVariant;
  onVariantChange: (variant: ConnectedVariant) => void;
}) => (
  <section className="testbench-config-section">
    <h2>Shell</h2>
    <div className="testbench-control-summary">
      <span className="testbench-control-label">
        <TerminalSquare />
        {connectedVariant === "base" ? "Panels" : "Registry editor"}
      </span>
      <span>
        Choose whether the connected workflow uses mdkit starter panels or the
        shadcn registry editor shell.
      </span>
    </div>
    <div className="testbench-actions testbench-inspector-actions">
      <Button
        type="button"
        variant={connectedVariant === "base" ? "default" : "outline"}
        onClick={() => onVariantChange("base")}
      >
        Panels
      </Button>
      <Button
        type="button"
        variant={connectedVariant === "shadcn" ? "default" : "outline"}
        onClick={() => onVariantChange("shadcn")}
      >
        Registry editor
      </Button>
    </div>
  </section>
);

const CollaborationInfoPanel = ({
  collaboration,
  collaborator,
  enabled,
  onCollaboratorChange,
}: {
  collaboration: ReturnType<typeof useMdKitCollaboration>;
  collaborator: MdKitCollaborationParticipant;
  enabled: boolean;
  onCollaboratorChange: (
    collaborator: MdKitCollaborationParticipant,
  ) => void;
}) => {
  const updateCollaborator = (
    patch: Partial<MdKitCollaborationParticipant>,
  ) => {
    onCollaboratorChange({
      ...collaborator,
      ...patch,
    });
  };

  return (
    <section className="testbench-config-section">
      <h2>Collaboration Info</h2>
      <div className="testbench-field-grid">
        <label className="testbench-field">
          <span>Name</span>
          <input
            className="testbench-input"
            value={collaborator.name}
            onChange={(event) =>
              updateCollaborator({ name: event.currentTarget.value })
            }
          />
        </label>
        <label className="testbench-field">
          <span>ID</span>
          <input
            className="testbench-input"
            value={collaborator.id}
            onChange={(event) =>
              updateCollaborator({ id: event.currentTarget.value })
            }
          />
        </label>
        <label className="testbench-field">
          <span>Color</span>
          <input
            className="testbench-input testbench-color-input"
            type="color"
            value={collaborator.color ?? "#2563eb"}
            onChange={(event) =>
              updateCollaborator({ color: event.currentTarget.value })
            }
          />
        </label>
      </div>
      <div className="testbench-collaboration-summary">
        <Badge variant="outline">
          {enabled ? (collaboration?.status ?? "connecting") : "off"}
        </Badge>
        <Badge variant="outline">
          {collaboration?.isCollaborating ? "collaborating" : "solo"}
        </Badge>
      </div>
      {collaboration ? (
        <ul className="testbench-participant-list">
          {collaboration.participants.map((participant) => (
            <li key={participant.clientId}>
              <span
                className="testbench-participant-swatch"
                style={{ backgroundColor: participant.color }}
              />
              <span>{participant.name}</span>
              {participant.isLocal ? <small>this tab</small> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
};

const StylingPanel = ({
  editorTheme,
  onEditorThemeChange,
}: {
  editorTheme: MdKitEditorTheme;
  onEditorThemeChange: (theme: MdKitEditorTheme) => void;
}) => (
  <section className="testbench-config-section">
    <h2>Styling</h2>
    <MdKitThemeEditor
      className="testbench-theme-editor"
      theme={editorTheme}
      onChange={onEditorThemeChange}
      onReset={() => onEditorThemeChange(defaultMdKitEditorTheme)}
    />
  </section>
);

const UnconnectedStoragePanel = ({
  clearMemory,
  clearStorage,
  resetSample,
  restoreMarkdown,
  storeMarkdown,
  storedMarkdown,
  storedStats,
}: {
  clearMemory: () => void;
  clearStorage: () => void;
  resetSample: () => void;
  restoreMarkdown: () => void;
  storeMarkdown: () => void;
  storedMarkdown: StoredMarkdown | null;
  storedStats: {
    characters: number;
    lines: number;
    words: number;
  } | null;
}) => (
  <section className="testbench-config-section">
    <div className="testbench-control-summary">
      <span className="testbench-control-label">
        <Database />
        Mock storage
      </span>
      {storedMarkdown && storedStats ? (
        <span>
          Stored {storedStats.characters} chars, {storedStats.words} words,{" "}
          {storedStats.lines} lines at {formatStoredAt(storedMarkdown.storedAt)}
        </span>
      ) : (
        <span>Empty</span>
      )}
    </div>
    <div className="testbench-actions testbench-inspector-actions">
      <Button type="button" variant="outline" onClick={clearMemory}>
        <Trash2 />
        Clear memory
      </Button>
      <Button type="button" variant="outline" onClick={resetSample}>
        <RotateCcw />
        Reset sample
      </Button>
      <Button type="button" variant="outline" onClick={storeMarkdown}>
        <Upload />
        Store
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={!storedMarkdown}
        onClick={restoreMarkdown}
      >
        <Download />
        Restore
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={!storedMarkdown}
        onClick={clearStorage}
      >
        <Trash2 />
        Clear storage
      </Button>
    </div>
  </section>
);

const ConnectedActionsPanel = ({
  debugStatus,
  documentId,
  document,
  simulateRemoteChange,
}: {
  debugStatus: string;
  documentId: string;
  document: ReturnType<typeof useMdKitDocument>;
  simulateRemoteChange: () => Promise<void>;
}) => (
  <section className="testbench-config-section">
    <div className="testbench-control-summary">
      <span className="testbench-control-label">
        <GitBranch />
        Connected document
      </span>
      <span>{documentId}</span>
      <span>{apiUrl}</span>
      <span>{debugStatus}</span>
    </div>
    <div className="testbench-actions testbench-inspector-actions">
      <Button
        type="button"
        variant="outline"
        disabled={!document.conflict}
        onClick={() => void document.forceSave()}
      >
        <Zap />
        Force save
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => void simulateRemoteChange()}
      >
        <GitBranch />
        Simulate remote change
      </Button>
    </div>
  </section>
);

const ConnectedStackCard = ({
  onStackChange,
  stackId,
}: {
  onStackChange: (stackId: ConnectedStackOptionId) => void;
  stackId: ConnectedStackOptionId;
}) => {
  return (
    <section className="testbench-connected-stack-card">
      <h2>Connected Stack</h2>
      <div className="testbench-actions testbench-inspector-actions">
        {connectedStacks.map((stack) => (
          <Button
            key={stack.id}
            type="button"
            variant={stack.id === stackId ? "default" : "outline"}
            onClick={() => onStackChange(stack.id)}
          >
            {stack.label}
          </Button>
        ))}
      </div>
    </section>
  );
};

const PlainTextEditor = ({
  fillHeight,
  onChange,
  onFocusChange,
  readOnly,
  value,
}: {
  fillHeight: boolean;
  onChange: (value: string) => void;
  onFocusChange: (focused: boolean) => void;
  readOnly?: boolean;
  value: string;
}) => (
  <Textarea
    className={
      fillHeight
        ? "testbench-plain-text-editor testbench-plain-text-editor-fill"
        : "testbench-plain-text-editor"
    }
    readOnly={readOnly}
    spellCheck={false}
    value={value}
    onBlur={() => onFocusChange(false)}
    onChange={(event) => onChange(event.currentTarget.value)}
    onFocus={() => onFocusChange(true)}
  />
);

const EditorWorkbench = ({
  children,
  components,
}: {
  children: ReactNode;
  components: string;
}) => (
  <section className="testbench-workbench">
    <div className="testbench-pane">
      <div className="testbench-pane-header">
        <h2>{components}</h2>
      </div>
      {children}
    </div>
  </section>
);

const EditorSurface = ({
  children,
  fillHeight,
}: {
  children: ReactNode;
  fillHeight: boolean;
}) => (
  <div
    className={
      fillHeight
        ? "testbench-library-surface testbench-library-surface-fill"
        : "testbench-library-surface"
    }
  >
    {children}
  </div>
);

const editorClassName = (fillHeight: boolean) =>
  fillHeight ? "testbench-editor testbench-editor-fill" : "testbench-editor";

const UnconnectedTab = ({
  editorFillHeight,
  editorStyle,
  editorTheme,
  onEditorThemeChange,
  onFillHeightChange,
  showInspector = true,
}: {
  editorFillHeight: boolean;
  editorStyle: MdKitEditorThemeStyle;
  editorTheme: MdKitEditorTheme;
  onEditorThemeChange: (theme: MdKitEditorTheme) => void;
  onFillHeightChange: (fillHeight: boolean) => void;
  showInspector?: boolean;
}) => {
  const [markdown, setMarkdown] = useState(sampleMarkdown);
  const [editorRevision, setEditorRevision] = useState(0);

  const [storedMarkdown, setStoredMarkdown] = useState<StoredMarkdown | null>(
    () => readStoredMarkdown(),
  );

  const [focusedPane, setFocusedPane] = useState<"editor" | "textarea" | null>(
    null,
  );

  const storedStats = useMemo(
    () =>
      storedMarkdown
        ? {
            characters: storedMarkdown.markdown.length,
            lines: storedMarkdown.markdown.split("\n").length,
            words: countWords(storedMarkdown.markdown),
          }
        : null,
    [storedMarkdown],
  );

  const storageMatchesMemory =
    storedMarkdown !== null && storedMarkdown.markdown === markdown;

  const remountEditor = () => {
    setEditorRevision((current) => current + 1);
  };

  const resetSample = () => {
    setMarkdown(sampleMarkdown);
    remountEditor();
  };

  const clearMemory = () => {
    setMarkdown("");
    remountEditor();
  };

  const storeMarkdown = () => {
    const nextStored = {
      markdown,
      storedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(storageKey, JSON.stringify(nextStored));
    setStoredMarkdown(nextStored);
  };

  const restoreMarkdown = () => {
    const currentStored = readStoredMarkdown();

    setStoredMarkdown(currentStored);

    if (!currentStored) {
      return;
    }

    setMarkdown(currentStored.markdown);
    remountEditor();
  };

  const clearStorage = () => {
    window.localStorage.removeItem(storageKey);
    setStoredMarkdown(null);
  };

  const inspectorTabs: InspectorTab[] = [
    {
      id: "storage",
      label: "Actions",
      content: (
        <UnconnectedStoragePanel
          clearMemory={clearMemory}
          clearStorage={clearStorage}
          resetSample={resetSample}
          restoreMarkdown={restoreMarkdown}
          storeMarkdown={storeMarkdown}
          storedMarkdown={storedMarkdown}
          storedStats={storedStats}
        />
      ),
    },
    {
      id: "state",
      label: "State",
      content: (
        <MarkdownStatePanel
          focusedPane={focusedPane}
          markdown={markdown}
          storageMatchesMemory={storedMarkdown ? storageMatchesMemory : null}
          onBlur={() => setFocusedPane(null)}
          onChange={setMarkdown}
          onFocus={() => setFocusedPane("textarea")}
        />
      ),
    },
    {
      id: "controls",
      label: "Controls",
      content: (
        <>
          <BehaviorPanel
            fillHeight={editorFillHeight}
            onFillHeightChange={onFillHeightChange}
          />
          <StylingPanel
            editorTheme={editorTheme}
            onEditorThemeChange={onEditorThemeChange}
          />
        </>
      ),
    },
  ];

  return (
    <>
      <section className="testbench-preview-section">
        <div
          className={
            showInspector ? "testbench-split-layout" : "testbench-qa-layout"
          }
        >
          <EditorWorkbench components="MdKitEditor">
            <EditorSurface fillHeight={editorFillHeight}>
              <MdKitEditor
                className={editorClassName(editorFillHeight)}
                fillHeight={editorFillHeight}
                ignoreYamlFrontMatter
                instanceKey={editorRevision}
                search
                style={editorStyle}
                value={markdown}
                onChange={setMarkdown}
                onFocusChange={(focused) =>
                  setFocusedPane(focused ? "editor" : null)
                }
              />
            </EditorSurface>
          </EditorWorkbench>
          {showInspector ? <Inspector tabs={inspectorTabs} /> : null}
        </div>
      </section>
    </>
  );
};

const ReadOnlyTab = ({
  editorFillHeight,
  editorStyle,
  editorTheme,
  onEditorThemeChange,
  onFillHeightChange,
  showInspector = true,
}: {
  editorFillHeight: boolean;
  editorStyle: MdKitEditorThemeStyle;
  editorTheme: MdKitEditorTheme;
  onEditorThemeChange: (theme: MdKitEditorTheme) => void;
  onFillHeightChange: (fillHeight: boolean) => void;
  showInspector?: boolean;
}) => {
  const [markdown, setMarkdown] = useState(readOnlySampleMarkdown);
  const [focusedPane, setFocusedPane] = useState<"textarea" | null>(null);

  const inspectorTabs: InspectorTab[] = [
    {
      id: "controls",
      label: "Controls",
      content: (
        <>
          <BehaviorPanel
            fillHeight={editorFillHeight}
            onFillHeightChange={onFillHeightChange}
          />
          <StylingPanel
            editorTheme={editorTheme}
            onEditorThemeChange={onEditorThemeChange}
          />
        </>
      ),
    },
    {
      id: "state",
      label: "State",
      content: (
        <MarkdownStatePanel
          focusedPane={focusedPane}
          markdown={markdown}
          onBlur={() => setFocusedPane(null)}
          onChange={setMarkdown}
          onFocus={() => setFocusedPane("textarea")}
        />
      ),
    },
  ];

  return (
    <section className="testbench-preview-section">
      <div
        className={
          showInspector ? "testbench-split-layout" : "testbench-qa-layout"
        }
      >
        <EditorWorkbench components="MdKitView">
          <EditorSurface fillHeight={editorFillHeight}>
            <MdKitView
              className={editorClassName(editorFillHeight)}
              fillHeight={editorFillHeight}
              ignoreYamlFrontMatter
              style={editorStyle}
              value={markdown}
            />
          </EditorSurface>
        </EditorWorkbench>
        {showInspector ? <Inspector tabs={inspectorTabs} /> : null}
      </div>
    </section>
  );
};

const ConnectedTab = ({
  documentDebounceMs = 450,
  editorFillHeight,
  editorStyle,
  editorTheme,
  initialStackId,
  initialVariant,
  onEditorThemeChange,
  onFillHeightChange,
  showInspector = true,
}: {
  documentDebounceMs?: number;
  editorFillHeight: boolean;
  editorStyle: MdKitEditorThemeStyle;
  editorTheme: MdKitEditorTheme;
  initialStackId: ConnectedStackOptionId;
  initialVariant: ConnectedVariant;
  onEditorThemeChange: (theme: MdKitEditorTheme) => void;
  onFillHeightChange: (fillHeight: boolean) => void;
  showInspector?: boolean;
}) => {
  const [connectedVariant, setConnectedVariant] =
    useState<ConnectedVariant>(initialVariant);

  const [stackId, setStackId] =
    useState<ConnectedStackOptionId>(initialStackId);

  const activeStack = connectedStackById[stackId];
  const activeDocumentId =
    activeStack.editorKind === "plain-text"
      ? plainTextConnectedDocumentId
      : connectedDocumentId;

  const trpc = useMemo(
    () =>
      createTRPCProxyClient<AppRouter>({
        links: [httpBatchLink({ url: trpcUrl() })],
      }),
    [],
  );

  const mdkitClient = useMemo((): MdKitTestbenchTrpcClient => {
    switch (activeStack.backendStackId) {
      case "checkpoints":
        return trpc.checkpoints;
      case "collaboration":
        return trpc.collaboration;
      case "storage":
        return trpc.storage;
      case "full":
        return trpc.full;
    }
  }, [activeStack.backendStackId, trpc]);

  const adapter = useMemo(
    () => createMdKitTrpcAdapter({ client: mdkitClient }),
    [mdkitClient],
  );

  const [debugStatus, setDebugStatus] = useState("Backend idle");
  const [activeInspectorTab, setActiveInspectorTab] = useState("state");
  const [collaborator, setCollaborator] = useState(createDefaultCollaborator);
  const [focusedPane, setFocusedPane] = useState<
    "editor" | "textarea" | null
  >(null);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);

  const document = useMdKitDocument({
    adapter,
    debounceMs: documentDebounceMs,
    documentId: activeDocumentId,
    pollMs: 1200,
  });

  const versions = useMdKitDocumentVersions({
    adapter,
    documentId: activeDocumentId,
    enabled: activeStack.hasCheckpoints,
  });

  const collaboration = useMdKitCollaboration({
    collaborator: {
      color: collaborator.color,
      id: collaborator.id || "testbench-user",
      name: collaborator.name || "Testbench",
    },
    documentId: activeDocumentId,
    enabled: activeStack.hasCollaboration,
    endpoint: activeStack.hasCollaboration
      ? collaborationEndpoint(activeStack.backendStackId)
      : null,
  });

  const useCollaborativeEditor =
    activeStack.editorKind === "markdown" ? collaboration : null;

  const setDocumentContent = useCallback(
    (next: string) => {
      document.setContent(next);

      if (useCollaborativeEditor) {
        replaceMdKitYjsMarkdown(useCollaborativeEditor.document, next);
      }
    },
    [document, useCollaborativeEditor],
  );

  const setDocumentFocused = useCallback(
    (focused: boolean, pane: "editor" | "textarea") => {
      document.setFocused(focused);
      setFocusedPane(focused ? pane : null);
    },
    [document],
  );

  const renderEditor = () => {
    if (activeStack.editorKind === "plain-text") {
      return (
        <PlainTextEditor
          fillHeight={editorFillHeight}
          readOnly={document.conflict}
          value={document.value}
          onChange={document.setContent}
          onFocusChange={(focused) => setDocumentFocused(focused, "editor")}
        />
      );
    }

    return useCollaborativeEditor ? (
      <MdKitEditor
        className={editorClassName(editorFillHeight)}
        collaboration={useCollaborativeEditor}
        fillHeight={editorFillHeight}
        ignoreYamlFrontMatter
        readOnly={document.conflict}
        search
        style={editorStyle}
        value={document.value}
        onChange={document.setContent}
        onFocusChange={(focused) => setDocumentFocused(focused, "editor")}
      />
    ) : (
      <MdKitEditor
        className={editorClassName(editorFillHeight)}
        fillHeight={editorFillHeight}
        ignoreYamlFrontMatter
        instanceKey={document.revision}
        readOnly={document.conflict}
        search
        style={editorStyle}
        value={document.value}
        onChange={document.setContent}
        onFocusChange={(focused) => setDocumentFocused(focused, "editor")}
      />
    );
  };

  const restoreVersion = async (version: MdKitDocumentVersionDetail) => {
    await mdkitClient.restoreDocumentVersion.mutate({
      documentId: activeDocumentId,
      versionId: version.id,
    });

    await document.resync();
    await versions.refresh();
  };

  const simulateRemoteChange = async () => {
    setDebugStatus("Writing remote change...");

    try {
      const remote = await adapter.readDocument(activeDocumentId);

      const result = await adapter.writeDocument({
        baseVersion: remote.version,
        content: `${remote.content}\n\nRemote change ${new Date().toLocaleTimeString()}`,
        documentId: activeDocumentId,
      });

      if ("conflict" in result) {
        setDebugStatus(`Remote write conflicted at ${String(result.version)}`);
        return;
      }

      await versions.refresh();
      setDebugStatus(`Remote wrote version ${String(result.version)}`);
    } catch (error) {
      setDebugStatus(`Remote write failed: ${String(error)}`);
    }
  };

  const inspectorTabs: InspectorTab[] = [
    {
      id: "actions",
      label: "Actions",
      content: (
        <ConnectedActionsPanel
          debugStatus={debugStatus}
          documentId={activeDocumentId}
          document={document}
          simulateRemoteChange={simulateRemoteChange}
        />
      ),
    },
    {
      id: "state",
      label: "State",
      content: (
        <MarkdownStatePanel
          focusedPane={focusedPane}
          label={
            activeStack.editorKind === "plain-text"
              ? "Plain Text State"
              : "Markdown State"
          }
          markdown={document.value}
          onBlur={() => setDocumentFocused(false, "textarea")}
          onChange={setDocumentContent}
          onFocus={() => setDocumentFocused(true, "textarea")}
        />
      ),
    },
    {
      id: "controls",
      label: "Controls",
      content: (
        <>
          <ConnectedShellPanel
            connectedVariant={connectedVariant}
            onVariantChange={setConnectedVariant}
          />
          <BehaviorPanel
            fillHeight={editorFillHeight}
            onFillHeightChange={onFillHeightChange}
          />
          <StylingPanel
            editorTheme={editorTheme}
            onEditorThemeChange={onEditorThemeChange}
          />
        </>
      ),
    },
    {
      id: "collaboration",
      label: "Collaboration",
      content: (
        <CollaborationInfoPanel
          collaboration={collaboration}
          collaborator={collaborator}
          enabled={activeStack.hasCollaboration}
          onCollaboratorChange={setCollaborator}
        />
      ),
    },
  ].filter(
    (tab) => activeStack.editorKind === "markdown" || tab.id !== "collaboration",
  );

  return (
    <>
      <section className="testbench-preview-section">
        <div
          className={
            showInspector ? "testbench-split-layout" : "testbench-qa-layout"
          }
        >
          <EditorWorkbench
            components={
              activeStack.editorKind === "plain-text"
                ? "Plain text editor, MdKitDocumentToolbar, MdKitConflictPanel, VersionHistoryPanel"
                : connectedVariant === "base"
                ? "MdKitEditor, MdKitDocumentToolbar, MdKitConflictPanel, VersionHistoryPanel"
                : "MdKitConnectedEditor from the shadcn registry source"
            }
          >
            {connectedVariant === "base" ? (
              <>
                <MdKitDocumentToolbar
                  collaboration={collaboration}
                  document={document}
                  onOpenConflict={() => setConflictOpen(true)}
                  showConflictActions={false}
                  versions={activeStack.hasCheckpoints ? versions : null}
                  onOpenVersionHistory={() => {
                    setVersionHistoryOpen((current) => !current);
                  }}
                />
                <EditorSurface fillHeight={editorFillHeight}>
                  {renderEditor()}
                </EditorSurface>
              </>
            ) : activeStack.editorKind === "markdown" ? (
              <MdKitConnectedEditor
                collaboration={collaboration}
                document={document}
                editorClassName={editorClassName(editorFillHeight)}
                editorFillHeight={editorFillHeight}
                editorStyle={editorStyle}
                versions={activeStack.hasCheckpoints ? versions : null}
                onRestoreVersion={restoreVersion}
              />
            ) : (
              <MdKitEditorChrome
                collaboration={collaboration}
                document={document}
                versions={activeStack.hasCheckpoints ? versions : null}
                onRestoreVersion={restoreVersion}
              >
                <EditorSurface fillHeight={editorFillHeight}>
                  {renderEditor()}
                </EditorSurface>
              </MdKitEditorChrome>
            )}
          </EditorWorkbench>
          {connectedVariant === "base" ? (
            <>
              <Dialog
                open={versionHistoryOpen}
                onOpenChange={setVersionHistoryOpen}
              >
                <DialogContent className="testbench-panel-dialog">
                  <DialogHeader>
                    <DialogTitle>Version history</DialogTitle>
                    <DialogDescription>
                      The bundled panel is starter UI backed by mdkit hooks;
                      replace it when your product needs a custom workflow.
                    </DialogDescription>
                  </DialogHeader>
                  <VersionHistoryPanel
                    className="testbench-history"
                    controller={versions}
                    onRestoreVersion={(version) => void restoreVersion(version)}
                  />
                </DialogContent>
              </Dialog>
              <Dialog
                open={document.conflict && conflictOpen}
                onOpenChange={setConflictOpen}
              >
                <DialogContent className="testbench-panel-dialog testbench-panel-dialog-narrow">
                  <DialogHeader>
                    <DialogTitle>Resolve conflict</DialogTitle>
                    <DialogDescription>
                      The bundled panel is starter UI backed by mdkit hooks;
                      replace it when your product needs a custom conflict flow.
                    </DialogDescription>
                  </DialogHeader>
                  <MdKitConflictPanel document={document} />
                </DialogContent>
              </Dialog>
            </>
          ) : null}
          {showInspector ? (
            <ConnectedSidebar
              activeInspectorTab={activeInspectorTab}
              inspectorTabs={inspectorTabs}
              stackId={stackId}
              onActiveInspectorTabChange={setActiveInspectorTab}
              onStackChange={setStackId}
            />
          ) : null}
        </div>
      </section>
    </>
  );
};

export const App = () => {
  const route = useMemo(() => readTestbenchRoute(), []);
  const [activeTab, setActiveTab] = useState<ActiveTab>(route.initialTab);

  const [editorTheme, setEditorTheme] = useState<MdKitEditorTheme>(
    defaultMdKitEditorTheme,
  );

  const [editorFillHeight, setEditorFillHeight] = useState(true);

  const editorStyle = useMemo(
    () => createMdKitEditorThemeStyle(editorTheme),
    [editorTheme],
  );

  return (
    <main
      className={
        route.qaMode ? "testbench-shell testbench-shell-qa" : "testbench-shell"
      }
    >
      {route.qaMode ? null : (
        <header className="testbench-header">
          <div>
            <p className="testbench-eyebrow">mdkit-testbench</p>
            <h1>
              <TerminalSquare />
              Markdown editor testbench
            </h1>
          </div>
          <div className="testbench-actions">
            <nav className="testbench-tabs" aria-label="Testbench views">
              <Button
                type="button"
                variant="ghost"
                className={
                  activeTab === "unconnected"
                    ? "testbench-tab testbench-tab-active"
                    : "testbench-tab"
                }
                onClick={() => setActiveTab("unconnected")}
              >
                <TerminalSquare />
                Unconnected
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={
                  activeTab === "connected"
                    ? "testbench-tab testbench-tab-active"
                    : "testbench-tab"
                }
                onClick={() => setActiveTab("connected")}
              >
                <GitBranch />
                Connected
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={
                  activeTab === "read-only"
                    ? "testbench-tab testbench-tab-active"
                    : "testbench-tab"
                }
                onClick={() => setActiveTab("read-only")}
              >
                <Eye />
                Read-only
              </Button>
            </nav>
            {docsUrl ? (
              <Button asChild variant="outline">
                <a href={docsUrl}>
                  <BookOpen />
                  Docs
                </a>
              </Button>
            ) : null}
          </div>
        </header>
      )}
      {activeTab === "unconnected" ? (
        <UnconnectedTab
          editorFillHeight={editorFillHeight}
          editorStyle={editorStyle}
          editorTheme={editorTheme}
          onEditorThemeChange={setEditorTheme}
          onFillHeightChange={setEditorFillHeight}
          showInspector={!route.qaMode}
        />
      ) : activeTab === "read-only" ? (
        <ReadOnlyTab
          editorFillHeight={editorFillHeight}
          editorStyle={editorStyle}
          editorTheme={editorTheme}
          onEditorThemeChange={setEditorTheme}
          onFillHeightChange={setEditorFillHeight}
          showInspector={!route.qaMode}
        />
      ) : (
        <ConnectedTab
          documentDebounceMs={route.qaMode ? 3000 : 450}
          editorFillHeight={editorFillHeight}
          editorStyle={editorStyle}
          editorTheme={editorTheme}
          initialStackId={route.initialStackId}
          initialVariant={route.connectedVariant}
          onEditorThemeChange={setEditorTheme}
          onFillHeightChange={setEditorFillHeight}
          showInspector
        />
      )}
    </main>
  );
};
