import type { CSSProperties } from "react";
import type { MdKitCollaborationSession } from "../document/documentTypes";
import { joinClassNames } from "../ui/joinClassNames";
import type { MdKitEditorDebugEvent } from "./editorDebug";
import { TiptapMarkdownSurface } from "./TiptapMarkdownSurface";

type MdKitEditorBaseProps = {
  className?: string;
  fillHeight?: boolean;
  ignoreYamlFrontMatter?: boolean;
  instanceKey?: string | number;
  onDebugEvent?: (event: MdKitEditorDebugEvent) => void;
  onFocusChange?: (focused: boolean) => void;
  readOnly?: boolean;
  search?: boolean;
  style?: CSSProperties;
};

type LocalMdKitEditorProps = MdKitEditorBaseProps & {
  collaboration?: null;
  onChange?: (markdown: string) => void;
  value: string;
};

type CollaborativeMdKitEditorProps = MdKitEditorBaseProps & {
  collaboration: MdKitCollaborationSession;
  onChange?: (markdown: string) => void;
  value?: string;
};

export type MdKitEditorProps =
  | CollaborativeMdKitEditorProps
  | LocalMdKitEditorProps;

export const MdKitEditor = (props: MdKitEditorProps) => {
  const {
    className,
    fillHeight = false,
    readOnly = false,
    style,
    ...surfaceProps
  } = props;

  return (
    <div
      className={joinClassNames(
        "mp-lb-mdkit-markdown-editor",
        fillHeight && "mp-lb-mdkit-markdown-editor-fill-height",
        className,
      )}
      data-read-only={readOnly ? "true" : undefined}
      style={style}
    >
      <TiptapMarkdownSurface
        key={props.instanceKey}
        readOnly={readOnly}
        {...surfaceProps}
      />
    </div>
  );
};
