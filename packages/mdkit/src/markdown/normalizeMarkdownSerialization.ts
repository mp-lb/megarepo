const placeholderLinePattern = /^[ \t]*(?:&nbsp;|\u00a0)[ \t]*$/;

const normalizePlaceholderParagraphs = (markdown: string) => {
  const lines = markdown.split("\n");
  const normalizedLines: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (line !== "" && !placeholderLinePattern.test(line)) {
      normalizedLines.push(line);
      index += 1;
      continue;
    }

    const start = index;
    let placeholderCount = 0;

    while (
      index < lines.length &&
      ((lines[index] ?? "") === "" ||
        placeholderLinePattern.test(lines[index] ?? ""))
    ) {
      if (placeholderLinePattern.test(lines[index] ?? "")) {
        placeholderCount += 1;
      }

      index += 1;
    }

    if (placeholderCount === 0) {
      normalizedLines.push(...lines.slice(start, index));
      continue;
    }

    normalizedLines.push(
      ...Array.from({ length: placeholderCount + 1 }, () => ""),
    );
  }

  const normalizedMarkdown = normalizedLines.join("\n");

  return placeholderLinePattern.test(normalizedMarkdown.trim())
    ? ""
    : normalizedMarkdown;
};

export const normalizeMarkdownSerialization = (markdown: string) =>
  normalizePlaceholderParagraphs(
    markdown.replace(
      /^([ \t]*(?:[-*+]|\d+[.)])[ \t]+)(?:&nbsp;|\u00a0)[ \t]*$/gm,
      "$1",
    ),
  );
