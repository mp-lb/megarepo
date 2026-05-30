import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MdKitView } from "./MdKitView";

describe("MdKitView", () => {
  it("renders markdown without a ProseMirror editor", () => {
    const { container } = render(
      <MdKitView
        value={"# Read-only document\n\n- first\n- second\n\n[Link](https://example.com)"}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Read-only document" }),
    ).toBeTruthy();
    expect(screen.getByText("first")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Link" })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(container.querySelector(".ProseMirror")).toBeNull();
  });

  it("uses the editor shell classes and fill-height contract", () => {
    const { container } = render(
      <MdKitView
        className="custom-view"
        fillHeight
        style={{ minHeight: "12rem" }}
        value="Readonly"
      />,
    );

    const root = container.querySelector(".mp-lb-mdkit-markdown-editor");

    expect(root).toBeTruthy();
    expect(root).toHaveClass("mp-lb-mdkit-markdown-view");
    expect(root).toHaveClass("mp-lb-mdkit-markdown-editor-fill-height");
    expect(root).toHaveClass("custom-view");
    expect(root).toHaveAttribute("data-read-only", "true");
    expect(container.querySelector(".mp-lb-mdkit-editor-shell")).toBeTruthy();
    expect(container.querySelector(".mp-lb-mdkit-editor-surface")).toBeTruthy();
    expect(container.querySelector(".mp-lb-mdkit-tiptap")).toBeTruthy();
  });

  it("renders an empty surface when no value or placeholder is provided", () => {
    const { container } = render(<MdKitView value="" />);

    expect(container.querySelector(".mp-lb-mdkit-editor-empty")).toBeTruthy();
    expect(container.querySelector(".mp-lb-mdkit-tiptap")).toBeNull();
  });

  it("can render placeholder markdown for empty values", () => {
    render(<MdKitView placeholder="**No content yet.**" value="" />);

    expect(screen.getByText("No content yet.")).toBeTruthy();
  });

  it("renders YAML front matter by default", () => {
    render(<MdKitView value={'---\nkey: ["value"]\n---\n\n# Title'} />);

    expect(screen.getByText('key: ["value"]')).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Title" })).toBeTruthy();
  });

  it("can ignore YAML front matter", () => {
    render(
      <MdKitView
        ignoreYamlFrontMatter
        value={'---\nkey: ["value"]\n---\n\n# Title'}
      />,
    );

    expect(screen.queryByText('key: ["value"]')).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "Title" })).toBeTruthy();
  });

  it("lets fill-height read-only content grow instead of clipping code blocks", () => {
    const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");

    expect(css).toMatch(
      /\.mp-lb-mdkit-markdown-view\.mp-lb-mdkit-markdown-editor-fill-height\s+\.mp-lb-mdkit-editor-shell\s*{[^}]*overflow:\s*visible;/,
    );
    expect(css).toMatch(
      /\.mp-lb-mdkit-markdown-view\.mp-lb-mdkit-markdown-editor-fill-height\s+\.mp-lb-mdkit-editor-surface\s*{[^}]*overflow:\s*visible;/,
    );
    expect(css).toMatch(
      /\.mp-lb-mdkit-markdown-view\.mp-lb-mdkit-markdown-editor-fill-height\s+\.mp-lb-mdkit-view-content\s*{[^}]*display:\s*block;[^}]*flex:\s*0 0 auto;/,
    );
  });
});
