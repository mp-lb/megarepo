export type MarkdownFenceRange = {
  end: number;
  start: number;
};

const fenceStartPattern = /^ {0,3}(`{3,}|~{3,})/;

export const getMarkdownFenceRanges = (
  markdown: string,
): MarkdownFenceRange[] => {
  const ranges: MarkdownFenceRange[] = [];
  let activeFence: {
    char: "`" | "~";
    length: number;
    start: number;
  } | null = null;
  let lineStart = 0;

  while (lineStart < markdown.length) {
    const newlineIndex = markdown.indexOf("\n", lineStart);
    const lineEnd = newlineIndex === -1 ? markdown.length : newlineIndex;

    const nextLineStart =
      newlineIndex === -1 ? markdown.length : newlineIndex + 1;

    const line = markdown.slice(lineStart, lineEnd);
    const fenceMatch = line.match(fenceStartPattern);

    if (fenceMatch) {
      const marker = fenceMatch[1] ?? "";
      const markerChar = marker[0] as "`" | "~";

      if (!activeFence) {
        activeFence = {
          char: markerChar,
          length: marker.length,
          start: lineStart,
        };
      } else if (
        markerChar === activeFence.char &&
        marker.length >= activeFence.length
      ) {
        ranges.push({
          start: activeFence.start,
          end: nextLineStart,
        });

        activeFence = null;
      }
    }

    lineStart = nextLineStart;
  }

  if (activeFence) {
    ranges.push({
      start: activeFence.start,
      end: markdown.length,
    });
  }

  return ranges;
};

export const isInsideMarkdownFence = (
  index: number,
  ranges: MarkdownFenceRange[],
) => ranges.some((range) => index >= range.start && index < range.end - 1);
