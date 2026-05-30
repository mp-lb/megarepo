import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const markdownPastePluginKey = new PluginKey("mdkitMarkdownPaste");

const blockMarkdownPatterns = [
  /^ {0,3}#{1,6}\s+\S/m,
  /^ {0,3}(?:[-+*]|\d+[.)])\s+\S/m,
  /^ {0,3}>\s+\S/m,
  /^ {0,3}(?:```|~~~)/m,
  /^ {0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/m,
  /^\|.+\|\s*\n\|(?:\s*:?-{3,}:?\s*\|)+/m,
];

const inlineMarkdownPatterns = [
  /!\[[^\]]*]\([^)]+\)/,
  /\[[^\]]+]\([^)]+\)/,
  /(^|[^\w])(?:\*\*|__)\S[\s\S]*?\S(?:\*\*|__)($|[^\w])/,
  /(^|[^\w])`[^`\n]+`($|[^\w])/,
];

const getClipboardValue = (
  event: ClipboardEvent,
  mimeType: string,
): string => {
  try {
    return event.clipboardData?.getData(mimeType) ?? "";
  } catch {
    return "";
  }
};

export const shouldPastePlainTextAsMarkdown = (text: string) => {
  const trimmedText = text.trim();

  if (trimmedText.length === 0) {
    return false;
  }

  return [...blockMarkdownPatterns, ...inlineMarkdownPatterns].some((pattern) =>
    pattern.test(trimmedText),
  );
};

export const MarkdownPasteExtension = Extension.create({
  name: "mdkitMarkdownPaste",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: markdownPastePluginKey,
        props: {
          handlePaste: (view, event) => {
            if (view.state.selection.$from.parent.type.spec.code) {
              return false;
            }

            const markdownText = getClipboardValue(event, "text/markdown");
            const plainText = getClipboardValue(event, "text/plain");
            const pastedMarkdown = markdownText || plainText;

            if (!pastedMarkdown.trim()) {
              return false;
            }

            if (
              !markdownText &&
              !shouldPastePlainTextAsMarkdown(pastedMarkdown)
            ) {
              return false;
            }

            return this.editor.commands.insertContent(pastedMarkdown, {
              contentType: "markdown",
            });
          },
        },
      }),
    ];
  },
});
