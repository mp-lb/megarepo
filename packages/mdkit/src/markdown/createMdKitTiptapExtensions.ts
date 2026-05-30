import type { Extensions } from "@tiptap/core";
import { Markdown } from "@tiptap/markdown";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { MarkdownPasteExtension } from "./MarkdownPasteExtension";
import { MarkdownSearchExtension } from "./MarkdownSearchExtension";

type CreateMdKitTiptapExtensionsOptions = {
  placeholder?: string;
  undoRedo?: boolean;
};

export const defaultMdKitMarkdownPlaceholder = "Start writing...";

export const createMdKitTiptapExtensions = ({
  placeholder = defaultMdKitMarkdownPlaceholder,
  undoRedo = true,
}: CreateMdKitTiptapExtensionsOptions = {}): Extensions => [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4, 5, 6] },
    link: {
      HTMLAttributes: {
        rel: "noopener noreferrer",
        target: "_blank",
      },
      autolink: true,
      linkOnPaste: true,
      openOnClick: true,
    },
    undoRedo: undoRedo ? undefined : false,
  }),
  Placeholder.configure({
    placeholder,
  }),
  Markdown.configure({
    markedOptions: {
      gfm: true,
    },
  }),
  MarkdownPasteExtension,
  MarkdownSearchExtension,
];
