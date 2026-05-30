import { useState } from "react";
import type { MdKitDocumentController } from "./useMdKitDocument";
import { joinClassNames } from "../ui/joinClassNames";

export type MdKitConflictPanelProps = {
  className?: string;
  document: MdKitDocumentController;
  title?: string;
};

export const MdKitConflictPanel = ({
  className,
  document,
  title = "Document conflict",
}: MdKitConflictPanelProps) => {
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const [activePreview, setActivePreview] = useState<"local" | "remote">(
    "remote",
  );

  if (!document.conflict) {
    return null;
  }

  const runAction = async (name: string, action: () => Promise<unknown>) => {
    setPendingAction(name);

    try {
      await action();
    } finally {
      setPendingAction(null);
    }
  };

  const isBusy = pendingAction !== null || document.saveStatus === "saving";
  const conflictDetails = document.conflictDetails;

  const previewOptions = [
    {
      id: "remote" as const,
      label: "Keep remote",
      value:
        conflictDetails?.remoteContent ??
        "Remote content preview is not available. Keep remote will still reload the latest canonical document.",
    },
    {
      id: "local" as const,
      label: "Keep local",
      value: conflictDetails?.localContent ?? document.value,
    },
  ];

  const activePreviewOption =
    previewOptions.find((option) => option.id === activePreview) ??
    previewOptions[0];

  return (
    <section className={joinClassNames("mp-lb-mdkit-conflict-panel", className)}>
      <div className="mp-lb-mdkit-conflict-panel-content">
        <h2>{title}</h2>
        <p>
          Remote changes conflict with local edits. Choose the remote document,
          or keep your local document by overwriting the remote copy.
        </p>
        {document.error ? (
          <p className="mp-lb-mdkit-conflict-panel-error">{document.error}</p>
        ) : null}
        {conflictDetails ? (
          <p className="mp-lb-mdkit-conflict-panel-meta">
            Remote version {String(conflictDetails.remoteVersion ?? "none")}
            {conflictDetails.remoteUpdatedAt
              ? ` saved ${new Date(
                  conflictDetails.remoteUpdatedAt,
                ).toLocaleTimeString()}`
              : ""}
          </p>
        ) : null}
      </div>
      <div className="mp-lb-mdkit-conflict-panel-preview">
        <div className="mp-lb-mdkit-conflict-panel-tabs" role="tablist">
          {previewOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-selected={activePreviewOption.id === option.id}
              className={
                activePreviewOption.id === option.id
                  ? "mp-lb-mdkit-conflict-panel-tab mp-lb-mdkit-conflict-panel-tab-active"
                  : "mp-lb-mdkit-conflict-panel-tab"
              }
              role="tab"
              onClick={() => setActivePreview(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <textarea
          aria-label={`${activePreviewOption.label} conflict content`}
          readOnly
          value={activePreviewOption.value}
        />
      </div>
      <div className="mp-lb-mdkit-conflict-panel-action-row">
        <button
          type="button"
          className="mp-lb-mdkit-panel-secondary-action"
          disabled={isBusy}
          onClick={() => void runAction("reload", document.resync)}
        >
          {pendingAction === "reload" ? "Keeping remote..." : "Keep remote"}
        </button>
        <button
          type="button"
          className="mp-lb-mdkit-panel-secondary-action"
          disabled={isBusy}
          onClick={() => void runAction("overwrite", document.forceSave)}
        >
          {pendingAction === "overwrite" ? "Keeping local..." : "Keep local"}
        </button>
      </div>
    </section>
  );
};
