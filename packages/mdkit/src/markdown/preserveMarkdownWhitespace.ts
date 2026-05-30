import {
  getMarkdownFenceRanges,
  isInsideMarkdownFence,
} from "./markdownFenceRanges";

type MarkdownBlockToken = {
  content: string;
  separatorAfter: string;
};

const tokenizeMarkdownBlocks = (markdown: string): MarkdownBlockToken[] => {
  const ranges = getMarkdownFenceRanges(markdown);
  const tokens: MarkdownBlockToken[] = [];
  const separatorPattern = /\n{2,}/g;
  let contentStart = 0;
  let match: RegExpExecArray | null;

  while ((match = separatorPattern.exec(markdown))) {
    const separatorStart = match.index;
    const separator = match[0] ?? "";

    if (isInsideMarkdownFence(separatorStart, ranges)) {
      continue;
    }

    tokens.push({
      content: markdown.slice(contentStart, separatorStart),
      separatorAfter: separator,
    });

    contentStart = separatorStart + separator.length;
  }

  tokens.push({
    content: markdown.slice(contentStart),
    separatorAfter: "",
  });

  return tokens;
};

const blockPairKey = (left: MarkdownBlockToken, right: MarkdownBlockToken) =>
  `${left.content.trim()}\u0000${right.content.trim()}`;

const leadingNewlineRunPattern = /^\n+/;
const trailingNewlineRunPattern = /\n+$/;

const preserveOuterBlankLines = (
  previousRawMarkdown: string,
  nextSerializedMarkdown: string,
) => {
  const previousLeading = previousRawMarkdown.match(leadingNewlineRunPattern);
  const nextLeading = nextSerializedMarkdown.match(leadingNewlineRunPattern);
  const previousTrailing = previousRawMarkdown.match(trailingNewlineRunPattern);
  const nextTrailing = nextSerializedMarkdown.match(trailingNewlineRunPattern);

  const isBodyUnchanged =
    previousRawMarkdown.trim() === nextSerializedMarkdown.trim();

  let nextMarkdown = nextSerializedMarkdown;

  if (
    isBodyUnchanged &&
    previousLeading &&
    previousLeading[0].length > (nextLeading?.[0].length ?? 0)
  ) {
    nextMarkdown = `${previousLeading[0]}${nextMarkdown.trimStart()}`;
  }

  if (
    isBodyUnchanged &&
    previousTrailing &&
    previousTrailing[0].length > (nextTrailing?.[0].length ?? 0)
  ) {
    nextMarkdown = `${nextMarkdown.trimEnd()}${previousTrailing[0]}`;
  }

  return nextMarkdown;
};

export const preserveMarkdownWhitespace = (
  previousRawMarkdown: string,
  nextSerializedMarkdown: string,
) => {
  const outerPreservedMarkdown = preserveOuterBlankLines(
    previousRawMarkdown,
    nextSerializedMarkdown,
  );

  if (
    previousRawMarkdown === outerPreservedMarkdown ||
    !previousRawMarkdown.includes("\n\n") ||
    !outerPreservedMarkdown.includes("\n\n")
  ) {
    return outerPreservedMarkdown;
  }

  const previousTokens = tokenizeMarkdownBlocks(previousRawMarkdown);
  const nextTokens = tokenizeMarkdownBlocks(outerPreservedMarkdown);

  if (previousTokens.length < 2 || nextTokens.length < 2) {
    return outerPreservedMarkdown;
  }

  const preservedSeparators = new Map<string, string>();

  for (let index = 0; index < previousTokens.length - 1; index += 1) {
    const left = previousTokens[index];
    const right = previousTokens[index + 1];

    if (!left || !right || left.separatorAfter.length <= 2) {
      continue;
    }

    preservedSeparators.set(blockPairKey(left, right), left.separatorAfter);
  }

  if (preservedSeparators.size === 0) {
    return outerPreservedMarkdown;
  }

  return nextTokens
    .map((token, index) => {
      const nextToken = nextTokens[index + 1];

      if (!nextToken || !token.separatorAfter) {
        return token.content;
      }

      const preservedSeparator = preservedSeparators.get(
        blockPairKey(token, nextToken),
      );

      const separator =
        preservedSeparator &&
        preservedSeparator.length > token.separatorAfter.length
          ? preservedSeparator
          : token.separatorAfter;

      return `${token.content}${separator}`;
    })
    .join("");
};
