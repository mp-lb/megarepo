import {
  getMarkdownFenceRanges,
  isInsideMarkdownFence,
} from "./markdownFenceRanges";

const expandedBlankLineRunPattern = /\n{3,}/g;

export const prepareMarkdownForEditorHydration = (markdown: string) => {
  const fenceRanges = getMarkdownFenceRanges(markdown);

  return markdown.replace(expandedBlankLineRunPattern, (newlineRun, offset) => {
    if (isInsideMarkdownFence(offset, fenceRanges)) {
      return newlineRun;
    }

    const emptyParagraphs = Array.from(
      { length: newlineRun.length - 2 },
      () => "&nbsp;",
    ).join("\n\n");

    return `\n\n${emptyParagraphs}\n\n`;
  });
};
