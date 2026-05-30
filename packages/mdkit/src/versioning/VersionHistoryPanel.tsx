import { useState } from "react";
import type { MdKitDocumentVersionDetail } from "../document/documentTypes";
import type { MdKitDocumentVersionsController } from "./useMdKitDocumentVersions";
import { joinClassNames } from "../ui/joinClassNames";

export type VersionHistoryPanelProps = {
  className?: string;
  controller: MdKitDocumentVersionsController;
  onRestoreVersion?: (
    version: MdKitDocumentVersionDetail,
  ) => Promise<void> | void;
  title?: string;
};

const getVersionLabel = (
  version: Pick<MdKitDocumentVersionDetail, "id" | "label" | "version">,
) => {
  if (version.label) {
    return version.label;
  }

  if (version.version != null) {
    return `Version ${String(version.version)}`;
  }

  return version.id.slice(0, 8);
};

export const VersionHistoryPanel = ({
  className,
  controller,
  onRestoreVersion,
  title = "Version history",
}: VersionHistoryPanelProps) => {
  const [isRestoring, setIsRestoring] = useState(false);

  const restoreSelectedVersion = async () => {
    if (!controller.selectedVersion || !onRestoreVersion) {
      return;
    }

    setIsRestoring(true);

    try {
      await onRestoreVersion(controller.selectedVersion);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <aside className={joinClassNames("mp-lb-mdkit-version-history-panel", className)}>
      <div className="mp-lb-mdkit-version-history-header">
        <div>
          <h2 className="mp-lb-mdkit-version-history-title">{title}</h2>
          <p className="mp-lb-mdkit-version-history-subtitle">
            Browse saved revisions and restore one when you need it.
          </p>
        </div>
      </div>
      {!controller.hasVersioning ? (
        <div className="mp-lb-mdkit-version-history-empty">
          This adapter does not expose version history.
        </div>
      ) : null}
      {controller.error ? (
        <div className="mp-lb-mdkit-version-history-error">{controller.error}</div>
      ) : null}
      {controller.hasVersioning ? (
        <div className="mp-lb-mdkit-version-history-layout">
          <div className="mp-lb-mdkit-version-history-list" role="list">
            {controller.versions.length === 0 ? (
              <div className="mp-lb-mdkit-version-history-empty">
                No revisions have been recorded for this document yet.
              </div>
            ) : (
              controller.versions.map((version) => (
                <button
                  key={version.id}
                  type="button"
                  className={joinClassNames(
                    "mp-lb-mdkit-version-history-item",
                    controller.selectedVersionId === version.id &&
                      "mp-lb-mdkit-version-history-item-active",
                  )}
                  onClick={() => void controller.openVersion(version.id)}
                >
                  <span className="mp-lb-mdkit-version-history-item-title">
                    {getVersionLabel(version)}
                  </span>
                  <span className="mp-lb-mdkit-version-history-item-meta">
                    {new Date(version.createdAt).toLocaleString()}
                  </span>
                </button>
              ))
            )}
          </div>
          <div className="mp-lb-mdkit-version-history-preview">
            {controller.selectedVersion ? (
              <>
                <div className="mp-lb-mdkit-version-history-preview-header">
                  <div>
                    <h3 className="mp-lb-mdkit-version-history-preview-title">
                      {getVersionLabel(controller.selectedVersion)}
                    </h3>
                    <p className="mp-lb-mdkit-version-history-item-meta">
                      {new Date(
                        controller.selectedVersion.createdAt,
                      ).toLocaleString()}
                    </p>
                  </div>
                  {onRestoreVersion ? (
                    <button
                      type="button"
                      className="mp-lb-mdkit-panel-primary-action"
                      disabled={isRestoring}
                      onClick={() => void restoreSelectedVersion()}
                    >
                      {isRestoring ? "Restoring..." : "Restore"}
                    </button>
                  ) : null}
                </div>
                <pre className="mp-lb-mdkit-version-history-code">
                  {controller.selectedVersion.content}
                </pre>
              </>
            ) : (
              <div className="mp-lb-mdkit-version-history-empty">
                Select a saved revision to preview it here.
              </div>
            )}
          </div>
        </div>
      ) : null}
      {controller.isLoading ? (
        <div className="mp-lb-mdkit-version-history-meta">
          Loading version data...
        </div>
      ) : null}
    </aside>
  );
};
