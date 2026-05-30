import { Extension } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type MarkdownSearchMatch = {
  from: number;
  to: number;
};

type MarkdownSearchMeta = {
  activeIndex: number;
  matches: MarkdownSearchMatch[];
};

export const markdownSearchPluginKey = new PluginKey<DecorationSet>(
  "mdkitMarkdownSearch",
);

const createSearchDecorations = (
  document: Node,
  { activeIndex, matches }: MarkdownSearchMeta,
) =>
  DecorationSet.create(
    document,
    matches.map((match, index) =>
      Decoration.inline(match.from, match.to, {
        class:
          index === activeIndex
            ? "mp-lb-mdkit-search-match mp-lb-mdkit-search-match-active"
            : "mp-lb-mdkit-search-match",
      }),
    ),
  );

export const MarkdownSearchExtension = Extension.create({
  name: "mdkitMarkdownSearch",

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: markdownSearchPluginKey,
        props: {
          decorations(state) {
            return markdownSearchPluginKey.getState(state);
          },
        },
        state: {
          apply(transaction, previousDecorations) {
            const searchMeta = transaction.getMeta(markdownSearchPluginKey) as
              | MarkdownSearchMeta
              | undefined;

            if (searchMeta) {
              return createSearchDecorations(transaction.doc, searchMeta);
            }

            if (transaction.docChanged) {
              return previousDecorations.map(
                transaction.mapping,
                transaction.doc,
              );
            }

            return previousDecorations;
          },
          init(_config, instance) {
            return createSearchDecorations(instance.doc, {
              activeIndex: 0,
              matches: [],
            });
          },
        },
      }),
    ];
  },
});
