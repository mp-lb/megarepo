"use client"

import * as React from "react"
import { GitBranch, Users, Zap } from "lucide-react"
import {
  MdKitEditor,
  type MdKitCollaborationSession,
  type MdKitDocumentController,
  type MdKitEditorDebugEvent,
  type MdKitDocumentVersionDetail,
  type MdKitDocumentVersionsController,
} from "@mp-lb/mdkit"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type MdKitEditorChromeProps = {
  children: React.ReactNode
  className?: string
  collaboration?: MdKitCollaborationSession | null
  document: MdKitDocumentController
  onRestoreVersion?: (
    version: MdKitDocumentVersionDetail
  ) => Promise<void> | void
  title?: string
  versions?: MdKitDocumentVersionsController | null
}

type MdKitConnectedEditorProps = Omit<MdKitEditorChromeProps, "children"> & {
  editorClassName?: string
  editorFillHeight?: boolean
  editorStyle?: React.CSSProperties
}

type MdKitLocalEditorProps = {
  className?: string
  editorClassName?: string
  fillHeight?: boolean
  instanceKey?: string | number
  onChange?: (markdown: string) => void
  onDebugEvent?: (event: MdKitEditorDebugEvent) => void
  onFocusChange?: (focused: boolean) => void
  style?: React.CSSProperties
  title?: string
  value: string
}

const statusToneClassNames = {
  danger: "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  default: "border-border/70 bg-muted/30 text-muted-foreground",
  success:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning:
    "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
} as const

function getVersionLabel(
  version: Pick<MdKitDocumentVersionDetail, "id" | "label" | "version">
) {
  if (version.label) return version.label
  if (version.version != null) return `Version ${String(version.version)}`
  return version.id.slice(0, 8)
}

function getDocumentStatus(document: MdKitDocumentController) {
  if (document.conflict) {
    return { label: "Conflict", tone: "danger" as const }
  }

  if (document.saveStatus === "saving") {
    return { label: "Saving", tone: "warning" as const }
  }

  if (document.saveStatus === "pending") {
    return { label: "Autosave pending", tone: "warning" as const }
  }

  if (document.isDirty) {
    return { label: "Unsaved changes", tone: "warning" as const }
  }

  if (document.saveStatus === "saved") {
    return { label: "Saved", tone: "success" as const }
  }

  return { label: "Idle", tone: "default" as const }
}

function formatSavedAt(value: string | null) {
  if (!value) return "Never saved"
  return `Saved ${new Date(value).toLocaleTimeString()}`
}

export function MdKitEditorChrome({
  children,
  className,
  collaboration,
  document,
  onRestoreVersion,
  title = "Markdown editor",
  versions,
}: MdKitEditorChromeProps) {
  const [versionHistoryOpen, setVersionHistoryOpen] = React.useState(false)
  const [conflictOpen, setConflictOpen] = React.useState(false)
  const [isRestoring, setIsRestoring] = React.useState(false)
  const [pendingConflictAction, setPendingConflictAction] = React.useState<
    "local" | "remote" | null
  >(null)

  const status = getDocumentStatus(document)
  const canUseVersions = Boolean(versions?.hasVersioning)

  const openVersionHistory = async () => {
    if (!versions) return
    await versions.refresh()
    setVersionHistoryOpen(true)
  }

  const restoreSelectedVersion = async () => {
    if (!versions?.selectedVersion || !onRestoreVersion) return

    setIsRestoring(true)

    try {
      await onRestoreVersion(versions.selectedVersion)
      setVersionHistoryOpen(false)
    } finally {
      setIsRestoring(false)
    }
  }

  const keepRemote = async () => {
    setPendingConflictAction("remote")

    try {
      await document.resync()
      setConflictOpen(false)
    } finally {
      setPendingConflictAction(null)
    }
  }

  const keepLocal = async () => {
    setPendingConflictAction("local")

    try {
      const saved = await document.forceSave()
      if (saved) setConflictOpen(false)
    } finally {
      setPendingConflictAction(null)
    }
  }

  const remoteContent =
    document.conflictDetails?.remoteContent ??
    "Remote content preview is not available. Keep remote will still reload the latest canonical document."

  const localContent = document.conflictDetails?.localContent ?? document.value

  return (
    <section
      data-slot="mdkit-editor"
      className={cn("flex min-h-0 flex-1 flex-col gap-3", className)}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-card p-3 shadow-sm">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-medium">{title}</h2>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn("h-7 px-2.5", statusToneClassNames[status.tone])}
            >
              {status.label}
            </Badge>
            <Badge variant="outline" className="h-7 px-2.5">
              {formatSavedAt(document.updatedAt)}
            </Badge>
            {collaboration?.isCollaborating ? (
              <Badge variant="outline" className="h-7 gap-1.5 px-2.5">
                <Users className="size-3.5" />
                {collaboration.otherParticipants.length + 1} collaborators
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {canUseVersions ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={document.conflict}
              onClick={() => void openVersionHistory()}
            >
              <GitBranch />
              Version {String(document.version ?? "none")}
            </Button>
          ) : null}
          {document.conflict ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"
              onClick={() => setConflictOpen(true)}
            >
              <Zap />
              Resolve conflict
            </Button>
          ) : null}
        </div>
      </header>

      {children}

      {versions ? (
        <Dialog open={versionHistoryOpen} onOpenChange={setVersionHistoryOpen}>
          <DialogContent className="max-h-[min(42rem,calc(100vh-2rem))] overflow-hidden sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Version history</DialogTitle>
              <DialogDescription>
                Browse saved revisions and restore one when you need it.
              </DialogDescription>
            </DialogHeader>
            <div className="grid min-h-0 gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
              <div className="flex max-h-[28rem] flex-col gap-2 overflow-auto rounded-lg border bg-muted/30 p-2">
                {versions.versions.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    No revisions have been recorded for this document yet.
                  </p>
                ) : (
                  versions.versions.map((version) => (
                    <button
                      key={version.id}
                      type="button"
                      className={cn(
                        "rounded-md border p-3 text-left text-sm transition-colors",
                        versions.selectedVersionId === version.id
                          ? "bg-background shadow-sm"
                          : "border-transparent hover:bg-background/70"
                      )}
                      onClick={() => void versions.openVersion(version.id)}
                    >
                      <span className="block truncate font-medium">
                        {getVersionLabel(version)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {new Date(version.createdAt).toLocaleString()}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
                {versions.error ? (
                  <p className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-400">
                    {versions.error}
                  </p>
                ) : null}
                {versions.selectedVersion ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-medium">
                          {getVersionLabel(versions.selectedVersion)}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground">
                          {new Date(
                            versions.selectedVersion.createdAt
                          ).toLocaleString()}
                        </p>
                      </div>
                      {onRestoreVersion ? (
                        <Button
                          type="button"
                          disabled={isRestoring}
                          onClick={() => void restoreSelectedVersion()}
                        >
                          {isRestoring ? "Restoring..." : "Restore"}
                        </Button>
                      ) : null}
                    </div>
                    <pre className="min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/40 p-4 text-sm whitespace-pre-wrap">
                      {versions.selectedVersion.content}
                    </pre>
                  </>
                ) : (
                  <div className="flex min-h-[16rem] items-center justify-center rounded-lg border bg-muted/20 p-6 text-sm text-muted-foreground">
                    {versions.isLoading
                      ? "Loading version data..."
                      : "Select a saved revision to preview it here."}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      <Dialog open={document.conflict && conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent className="max-h-[min(38rem,calc(100vh-2rem))] overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve conflict</DialogTitle>
            <DialogDescription>
              Remote changes conflict with local edits. Inspect both versions,
              then choose which one to keep.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="remote" className="min-h-0">
            <TabsList>
              <TabsTrigger value="remote">Keep remote</TabsTrigger>
              <TabsTrigger value="local">Keep local</TabsTrigger>
            </TabsList>
            <TabsContent value="remote">
              <Textarea
                className="min-h-56 resize-y font-mono text-sm"
                readOnly
                value={remoteContent}
              />
            </TabsContent>
            <TabsContent value="local">
              <Textarea
                className="min-h-56 resize-y font-mono text-sm"
                readOnly
                value={localContent}
              />
            </TabsContent>
          </Tabs>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pendingConflictAction !== null}
              onClick={() => void keepRemote()}
            >
              {pendingConflictAction === "remote"
                ? "Keeping remote..."
                : "Keep remote"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pendingConflictAction !== null}
              onClick={() => void keepLocal()}
            >
              {pendingConflictAction === "local"
                ? "Keeping local..."
                : "Keep local"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

export function MdKitConnectedEditor({
  collaboration,
  document,
  editorClassName,
  editorFillHeight = true,
  editorStyle,
  onRestoreVersion,
  title,
  versions,
  ...props
}: MdKitConnectedEditorProps) {
  return (
    <MdKitEditorChrome
      collaboration={collaboration}
      document={document}
      onRestoreVersion={onRestoreVersion}
      title={title}
      versions={versions}
      {...props}
    >
      <MdKitEditor
        className={editorClassName}
        collaboration={collaboration ?? undefined}
        fillHeight={editorFillHeight}
        ignoreYamlFrontMatter
        instanceKey={document.revision}
        readOnly={document.conflict}
        search
        style={editorStyle}
        value={document.value}
        onChange={document.setContent}
        onFocusChange={document.setFocused}
      />
    </MdKitEditorChrome>
  )
}

export function MdKitLocalEditor({
  className,
  editorClassName,
  fillHeight = false,
  title = "Markdown editor",
  ...props
}: MdKitLocalEditorProps) {
  return (
    <section className={cn("flex min-h-0 flex-col gap-3", className)}>
      <header className="rounded-lg border border-border/70 bg-card p-3 shadow-sm">
        <h2 className="truncate text-sm font-medium">{title}</h2>
      </header>
      <MdKitEditor
        className={editorClassName}
        collaboration={null}
        fillHeight={fillHeight}
        ignoreYamlFrontMatter
        search
        {...props}
      />
    </section>
  )
}
