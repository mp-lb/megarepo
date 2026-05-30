import type { MouseEvent, PointerEvent, ReactNode } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu, type BubbleMenuProps } from "@tiptap/react/menus";
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
} from "lucide-react";
import { joinClassNames } from "../ui/joinClassNames";

type MarkdownBubbleMenuProps = {
  editor: Editor;
};

type BubbleMenuShouldShowProps = Parameters<
  NonNullable<BubbleMenuProps["shouldShow"]>
>[0];

type ToolbarActiveState = {
  blockquote: boolean;
  bold: boolean;
  bulletList: boolean;
  codeBlock: boolean;
  heading1: boolean;
  heading2: boolean;
  heading3: boolean;
  italic: boolean;
  link: boolean;
  orderedList: boolean;
  strike: boolean;
};

const toolbarActiveStateIsEqual = (
  left: ToolbarActiveState,
  right: ToolbarActiveState | null,
) => {
  if (!right) {
    return false;
  }

  return (
    left.blockquote === right.blockquote &&
    left.bold === right.bold &&
    left.bulletList === right.bulletList &&
    left.codeBlock === right.codeBlock &&
    left.heading1 === right.heading1 &&
    left.heading2 === right.heading2 &&
    left.heading3 === right.heading3 &&
    left.italic === right.italic &&
    left.link === right.link &&
    left.orderedList === right.orderedList &&
    left.strike === right.strike
  );
};

const useToolbarActiveState = (editor: Editor) =>
  useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      blockquote: currentEditor.isActive("blockquote"),
      bold: currentEditor.isActive("bold"),
      bulletList: currentEditor.isActive("bulletList"),
      codeBlock: currentEditor.isActive("codeBlock"),
      heading1: currentEditor.isActive("heading", { level: 1 }),
      heading2: currentEditor.isActive("heading", { level: 2 }),
      heading3: currentEditor.isActive("heading", { level: 3 }),
      italic: currentEditor.isActive("italic"),
      link: currentEditor.isActive("link"),
      orderedList: currentEditor.isActive("orderedList"),
      strike: currentEditor.isActive("strike"),
    }),
    equalityFn: toolbarActiveStateIsEqual,
  });

export const shouldShowMarkdownBubbleMenu = ({
  editor,
  element,
  from,
  state,
  to,
  view,
}: BubbleMenuShouldShowProps) => {
  const editorHasFocus =
    view.hasFocus() || element.contains(document.activeElement);

  const selectedText = state.doc.textBetween(from, to);

  return (
    editor.isEditable &&
    editorHasFocus &&
    !state.selection.empty &&
    selectedText.length > 0
  );
};

const setLink = (editor: Editor) => {
  const previousUrl = editor.getAttributes("link").href;
  const nextUrl = window.prompt("URL", previousUrl);

  if (nextUrl === null) {
    return;
  }

  if (nextUrl === "") {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }

  editor
    .chain()
    .focus()
    .extendMarkRange("link")
    .setLink({ href: nextUrl })
    .run();
};

const ToolbarButton = ({
  ariaLabel,
  children,
  isActive,
  onAction,
}: {
  ariaLabel: string;
  children: ReactNode;
  isActive: boolean;
  onAction: () => void;
}) => {
  const runPointerAction = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onAction();
  };

  const runKeyboardAction = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0) {
      return;
    }

    onAction();
  };

  return (
    <button
      type="button"
      className={joinClassNames(
        "mp-lb-mdkit-toolbar-button",
        isActive && "mp-lb-mdkit-toolbar-button-active",
      )}
      aria-label={ariaLabel}
      aria-pressed={isActive}
      onClick={runKeyboardAction}
      onPointerDown={runPointerAction}
    >
      {children}
    </button>
  );
};

export const MarkdownBubbleMenu = ({ editor }: MarkdownBubbleMenuProps) => {
  const activeState = useToolbarActiveState(editor);

  return (
    <BubbleMenu
      className="mp-lb-mdkit-toolbar"
      editor={editor}
      options={{
        placement: "top",
      }}
      shouldShow={shouldShowMarkdownBubbleMenu}
    >
      <ToolbarButton
        ariaLabel="Bold"
        isActive={activeState.bold}
        onAction={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="Italic"
        isActive={activeState.italic}
        onAction={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="Strikethrough"
        isActive={activeState.strike}
        onAction={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="Code block"
        isActive={activeState.codeBlock}
        onAction={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code2 />
      </ToolbarButton>
      <div className="mp-lb-mdkit-toolbar-divider" />
      <ToolbarButton
        ariaLabel="Heading 1"
        isActive={activeState.heading1}
        onAction={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
      >
        <Heading1 />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="Heading 2"
        isActive={activeState.heading2}
        onAction={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      >
        <Heading2 />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="Heading 3"
        isActive={activeState.heading3}
        onAction={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
      >
        <Heading3 />
      </ToolbarButton>
      <div className="mp-lb-mdkit-toolbar-divider" />
      <ToolbarButton
        ariaLabel="Bullet list"
        isActive={activeState.bulletList}
        onAction={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="Ordered list"
        isActive={activeState.orderedList}
        onAction={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="Blockquote"
        isActive={activeState.blockquote}
        onAction={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote />
      </ToolbarButton>
      <div className="mp-lb-mdkit-toolbar-divider" />
      <ToolbarButton
        ariaLabel="Link"
        isActive={activeState.link}
        onAction={() => setLink(editor)}
      >
        <Link2 />
      </ToolbarButton>
    </BubbleMenu>
  );
};
