import { parseDocument } from "yaml";

export type MdKitYamlFrontMatter = {
  data: unknown;
  raw: string;
  trailingWhitespace: string;
  yaml: string;
};

export type MdKitYamlFrontMatterExtraction = {
  body: string;
  errors: string[];
  frontMatter: MdKitYamlFrontMatter | null;
};

const delimiter = "---";

const getLineEnd = (markdown: string, lineStart: number) => {
  const newlineIndex = markdown.indexOf("\n", lineStart);

  if (newlineIndex === -1) {
    return {
      contentEnd: markdown.length,
      lineEnd: markdown.length,
      newline: "",
    };
  }

  const contentEnd =
    newlineIndex > lineStart && markdown[newlineIndex - 1] === "\r"
      ? newlineIndex - 1
      : newlineIndex;

  return {
    contentEnd,
    lineEnd: newlineIndex + 1,
    newline: markdown.slice(contentEnd, newlineIndex + 1),
  };
};

const getNextBodyStart = (markdown: string, lineStart: number) => {
  let bodyStart = lineStart;

  while (bodyStart < markdown.length) {
    const lineEnd = getLineEnd(markdown, bodyStart);
    const line = markdown.slice(bodyStart, lineEnd.contentEnd);

    if (!/^[ \t]*$/.test(line)) {
      break;
    }

    bodyStart = lineEnd.lineEnd;
  }

  return bodyStart;
};

export const parseYamlFrontMatter = (yaml: string): unknown => {
  const document = parseDocument(yaml, { prettyErrors: false });

  if (document.errors.length > 0) {
    throw new Error(document.errors.map((error) => error.message).join("\n"));
  }

  return document.toJSON();
};

export const extractYamlFrontMatter = (
  markdown: string,
): MdKitYamlFrontMatterExtraction => {
  const openingLine = getLineEnd(markdown, 0);

  if (markdown.slice(0, openingLine.contentEnd) !== delimiter) {
    return { body: markdown, errors: [], frontMatter: null };
  }

  let lineStart = openingLine.lineEnd;

  while (lineStart < markdown.length) {
    const lineEnd = getLineEnd(markdown, lineStart);
    const line = markdown.slice(lineStart, lineEnd.contentEnd);

    if (line !== delimiter) {
      lineStart = lineEnd.lineEnd;
      continue;
    }

    const bodyStart = getNextBodyStart(markdown, lineEnd.lineEnd);
    const raw = markdown.slice(0, bodyStart);
    const yaml = markdown.slice(openingLine.lineEnd, lineStart);
    const trailingWhitespace = markdown.slice(lineEnd.lineEnd, bodyStart);

    try {
      const data = parseYamlFrontMatter(yaml);

      return {
        body: markdown.slice(bodyStart),
        errors: [],
        frontMatter: {
          data,
          raw,
          trailingWhitespace,
          yaml,
        },
      };
    } catch (error) {
      return {
        body: markdown,
        errors: [error instanceof Error ? error.message : String(error)],
        frontMatter: null,
      };
    }
  }

  return { body: markdown, errors: [], frontMatter: null };
};

export const hasYamlFrontMatter = (markdown: string) =>
  extractYamlFrontMatter(markdown).frontMatter !== null;

export const removeYamlFrontMatter = (markdown: string) =>
  extractYamlFrontMatter(markdown).body;

export const prependYamlFrontMatter = (
  frontMatter: MdKitYamlFrontMatter | string | null,
  body: string,
) => {
  if (!frontMatter) {
    return body;
  }

  const raw = typeof frontMatter === "string" ? frontMatter : frontMatter.raw;

  return `${raw}${body}`;
};
