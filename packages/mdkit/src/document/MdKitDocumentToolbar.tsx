import { useState } from "react";
import type { MdKitCollaborationSession } from "./documentTypes";
import type { MdKitDocumentController } from "./useMdKitDocument";
import type { MdKitDocumentVersionsController } from "../versioning/useMdKitDocumentVersions";
import { joinClassNames } from "../ui/joinClassNames";

export type MdKitDocumentToolbarProps = {
  className?: string;
  collaboration?: MdKitCollaborationSession | null;
  document: MdKitDocumentController;
  onOpenConflict?: () => Promise<void> | void;
  onOpenVersionHistory?: () => Promise<void> | void;
  showConflictActions?: boolean;
  versions?: MdKitDocumentVersionsController | null;
};

const formatUpdatedAt = (updatedAt: string | null) => {
  if (!updatedAt) {
    return "Never saved";
  }

  return `Saved ${new Date(updatedAt).toLocaleTimeString()}`;
};

export const MdKitDocumentToolbar = ({
  className,
  collaboration,
  document,
  onOpenConflict,
  onOpenVersionHistory,
  showConflictActions = false,
  versions,
}: MdKitDocumentToolbarProps) => {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const otherCollaboratorCount = collaboration?.otherParticipants.length ?? 0;

  const runAction = async (name: string, action: () => Promise<unknown>) => {
    setPendingAction(name);

    try {
      await action();
    } finally {
      setPendingAction(null);
    }
  };

  const hasVersionHistory = versions?.hasVersioning ?? false;
  const hasActiveCollaborators = collaboration?.isCollaborating ?? false;
  const isBusy = pendingAction !== null || document.saveStatus === "saving";

  const status = document.conflict
    ? "Conflict"
    : document.isLoading
      ? "Loading"
      : document.saveStatus === "saving"
        ? "Saving"
        : document.saveStatus === "pending"
          ? "Autosave pending"
          : document.isDirty
            ? "Unsaved changes"
            : document.saveStatus === "saved"
              ? "Saved"
              : "Idle";

  return (
    <div
      className={joinClassNames("mp-lb-mdkit-document-toolbar", className)}
      data-conflict={document.conflict ? "true" : undefined}
      data-dirty={document.isDirty ? "true" : undefined}
      data-save-status={document.saveStatus}
      data-status={status.toLowerCase().replace(/\s+/g, "-")}
    >
      <div className="mp-lb-mdkit-document-toolbar-status">
        <strong>{status}</strong>
        <span>{formatUpdatedAt(document.updatedAt)}</span>
        {hasActiveCollaborators ? (
          <span>{otherCollaboratorCount + 1} collaborators</span>
        ) : null}
      </div>
      {document.error && !document.conflict ? (
        <div className="mp-lb-mdkit-document-toolbar-error">{document.error}</div>
      ) : null}
      <div className="mp-lb-mdkit-document-toolbar-actions">
        {hasVersionHistory && onOpenVersionHistory ? (
          <button
            type="button"
            disabled={isBusy || document.conflict || versions?.isLoading}
            onClick={() =>
              void runAction("versions", async () => {
                await versions?.refresh();
                await onOpenVersionHistory();
              })
            }
          >
            {versions?.isLoading
              ? "Loading versions..."
              : `Version ${String(document.version ?? "none")}`}
          </button>
        ) : null}
        {document.conflict && onOpenConflict ? (
          <button
            type="button"
            className="mp-lb-mdkit-document-toolbar-conflict-trigger"
            disabled={isBusy}
            onClick={() =>
              void runAction("conflict", async () => {
                await onOpenConflict();
              })
            }
          >
            Resolve conflict
          </button>
        ) : null}
      </div>
      {document.conflict && showConflictActions ? (
        <div className="mp-lb-mdkit-document-toolbar-conflict">
          <span>Remote changes conflict with local edits.</span>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void runAction("reload", document.resync)}
          >
            Keep remote
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void runAction("overwrite", document.forceSave)}
          >
            Keep local
          </button>
        </div>
      ) : null}
    </div>
  );
};
