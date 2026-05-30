import { useState } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import type { MdKitCollaborationSession } from "../document/documentTypes";
import { replaceMdKitYjsMarkdown } from "../yjs/MdKitMarkdownYjs";
import { MdKitEditor } from "./MdKitEditor";

const firstMarkdown = "# Stored document\n\nOriginal paragraph.";
const restoredMarkdown = "# Restored document\n\n- first\n- second";

const TestHarness = () => {
  const [value, setValue] = useState(firstMarkdown);
  const [revision, setRevision] = useState(0);

  const coldRestore = () => {
    setValue(restoredMarkdown);
    setRevision((current) => current + 1);
  };

  return (
    <div>
      <button type="button" onClick={() => setValue(restoredMarkdown)}>
        Replace from storage
      </button>
      <button type="button" onClick={coldRestore}>
        Cold restore
      </button>
      <MdKitEditor instanceKey={revision} value={value} onChange={setValue} />
    </div>
  );
};

const editorText = (container: HTMLElement) => {
  const editor = container.querySelector(".ProseMirror");

  if (!(editor instanceof HTMLElement)) {
    throw new Error("Expected TipTap to render a ProseMirror editor.");
  }

  return editor.textContent ?? "";
};

const getEditorElement = async (container: HTMLElement) =>
  waitFor(() => {
    const editor = container.querySelector(".ProseMirror");

    if (!(editor instanceof HTMLElement)) {
      throw new Error("Expected TipTap to render a ProseMirror editor.");
    }

    return editor;
  });

const pasteIntoEditor = (
  editor: HTMLElement,
  clipboardValues: Record<string, string>,
) => {
  fireEvent.paste(editor, {
    clipboardData: {
      getData: (mimeType: string) => clipboardValues[mimeType] ?? "",
    },
  });
};

const createCollaborationSession = (
  markdown: string,
): MdKitCollaborationSession => {
  const document = new Y.Doc();

  replaceMdKitYjsMarkdown(document, markdown);

  return {
    collaborator: {
      color: "hsl(220, 85%, 55%)",
      id: "user-1",
      name: "User 1",
    },
    document,
    isCollaborating: false,
    otherParticipants: [],
    participants: [],
    provider: null,
    roomName: "test-room",
    status: "connected",
  };
};

describe("MdKitEditor", () => {
  it("marks the editor as full-height when requested", async () => {
    const { container } = render(
      <MdKitEditor fillHeight value={firstMarkdown} onChange={() => {}} />,
    );

    await waitFor(() => {
      expect(
        container.querySelector(".mp-lb-mdkit-markdown-editor-fill-height"),
      ).toBeTruthy();

      expect(editorText(container)).toContain("Stored document");
    });
  });

  it("keeps the editor root full-width without fill-height", async () => {
    const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");

    expect(css).toMatch(/\.mp-lb-mdkit-markdown-editor\s*{[^}]*width:\s*100%;/);
  });

  it("can render the editor as read-only", async () => {
    const { container } = render(
      <MdKitEditor readOnly value="Read-only document" onChange={() => {}} />,
    );

    const editor = await waitFor(() => {
      const element = container.querySelector(".ProseMirror");

      if (!(element instanceof HTMLElement)) {
        throw new Error("Expected TipTap to render a ProseMirror editor.");
      }

      return element;
    });

    expect(editor.getAttribute("contenteditable")).toBe("false");
    expect(
      container
        .querySelector(".mp-lb-mdkit-markdown-editor")
        ?.getAttribute("data-read-only"),
    ).toBe("true");
  });

  it("hydrates and restores from serialized markdown values", async () => {
    const { container } = render(<TestHarness />);

    await waitFor(() => {
      expect(editorText(container)).toContain("Stored document");
      expect(editorText(container)).toContain("Original paragraph.");
    });

    await act(async () => {
      screen.getByRole("button", { name: "Replace from storage" }).click();
    });

    await waitFor(() => {
      expect(editorText(container)).toContain("Restored document");
      expect(editorText(container)).toContain("first");
      expect(editorText(container)).toContain("second");
    });

    await act(async () => {
      screen.getByRole("button", { name: "Cold restore" }).click();
    });

    await waitFor(() => {
      expect(editorText(container)).toContain("Restored document");
      expect(editorText(container)).toContain("first");
      expect(editorText(container)).toContain("second");
    });
  });

  it("hydrates middle blank-line runs as visible empty editor paragraphs", async () => {
    const markdown =
      "Before paragraph.\n\nWhitespace probe:\n\n\n\n\nAfter paragraph.";

    const { container } = render(
      <MdKitEditor value={markdown} onChange={() => {}} />,
    );

    await waitFor(() => {
      expect(editorText(container)).toContain("Whitespace probe:");
      expect(editorText(container)).toContain("After paragraph.");
    });

    const paragraphs = Array.from(container.querySelectorAll(".ProseMirror p"));

    const whitespaceParagraphIndex = paragraphs.findIndex(
      (paragraph) => paragraph.textContent === "Whitespace probe:",
    );

    const afterParagraphIndex = paragraphs.findIndex(
      (paragraph) => paragraph.textContent === "After paragraph.",
    );

    expect(whitespaceParagraphIndex).toBeGreaterThanOrEqual(0);
    expect(afterParagraphIndex).toBeGreaterThan(whitespaceParagraphIndex);
    expect(afterParagraphIndex - whitespaceParagraphIndex).toBeGreaterThan(1);
  });

  it("renders YAML front matter into the editor body by default", async () => {
    const { container } = render(
      <MdKitEditor value={'---\nkey: ["value"]\n---\n\n# Title'} />,
    );

    await waitFor(() => {
      expect(editorText(container)).toContain('key: ["value"]');
      expect(editorText(container)).toContain("Title");
    });
  });

  it("hydrates markdown headings using their source levels", async () => {
    const { container } = render(
      <MdKitEditor
        value={[
          "# Heading 1",
          "## Heading 2",
          "### Heading 3",
          "#### Heading 4",
          "##### Heading 5",
          "###### Heading 6",
        ].join("\n\n")}
        onChange={() => {}}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector(".ProseMirror h1")).toHaveTextContent(
        "Heading 1",
      );
      expect(container.querySelector(".ProseMirror h2")).toHaveTextContent(
        "Heading 2",
      );
      expect(container.querySelector(".ProseMirror h3")).toHaveTextContent(
        "Heading 3",
      );
      expect(container.querySelector(".ProseMirror h4")).toHaveTextContent(
        "Heading 4",
      );
      expect(container.querySelector(".ProseMirror h5")).toHaveTextContent(
        "Heading 5",
      );
      expect(container.querySelector(".ProseMirror h6")).toHaveTextContent(
        "Heading 6",
      );
    });
  });

  it("keeps h3 styled smaller than h2 in the bundled editor CSS", () => {
    const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");

    expect(css).toMatch(/--mp-lb-mdkit-heading-2-size:\s*1\.25rem;/);
    expect(css).toMatch(/--mp-lb-mdkit-heading-3-size:\s*1\.125rem;/);
    expect(css).toMatch(
      /\.mp-lb-mdkit-tiptap h2\s*{[^}]*font-size:\s*var\(--mp-lb-mdkit-heading-2-size\);/,
    );
    expect(css).toMatch(
      /\.mp-lb-mdkit-tiptap h3,\s*\.mp-lb-mdkit-tiptap h4,\s*\.mp-lb-mdkit-tiptap h5,\s*\.mp-lb-mdkit-tiptap h6\s*{[^}]*font-size:\s*var\(--mp-lb-mdkit-heading-3-size\);/,
    );
  });

  it("can ignore YAML front matter in the editor body", async () => {
    const { container } = render(
      <MdKitEditor
        ignoreYamlFrontMatter
        value={'---\nkey: ["value"]\n---\n\n# Title'}
      />,
    );

    await waitFor(() => {
      expect(editorText(container)).not.toContain('key: ["value"]');
      expect(editorText(container)).toContain("Title");
    });
  });

  it("keeps the same editor instance when controlled value changes", async () => {
    const { container, rerender } = render(
      <MdKitEditor value="one" onChange={() => {}} />,
    );

    const editor = await waitFor(() => {
      const element = container.querySelector(".ProseMirror");

      if (!(element instanceof HTMLElement)) {
        throw new Error("Expected TipTap to render a ProseMirror editor.");
      }

      return element;
    });

    rerender(<MdKitEditor value="one two" onChange={() => {}} />);

    await waitFor(() => {
      expect(container.querySelector(".ProseMirror")).toBe(editor);
      expect(editorText(container)).toContain("one two");
    });
  });

  it("does not apply controlled value changes into a collaborative document", async () => {
    const collaboration = createCollaborationSession(
      "# Shared document\n\nYjs owns this content.",
    );
    const onChange = vi.fn();

    const { container, rerender } = render(
      <MdKitEditor
        collaboration={collaboration}
        value="# Shared document\n\nYjs owns this content."
        onChange={onChange}
      />,
    );

    await waitFor(() => {
      expect(editorText(container)).toContain("Shared document");
      expect(editorText(container)).toContain("Yjs owns this content.");
    });

    rerender(
      <MdKitEditor
        collaboration={collaboration}
        value="# Late storage snapshot\n\nThis must not be inserted."
        onChange={onChange}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector(".ProseMirror")).toBeTruthy();
    });

    expect(editorText(container)).toContain("Shared document");
    expect(editorText(container)).toContain("Yjs owns this content.");
    expect(editorText(container)).not.toContain("Late storage snapshot");
    expect(editorText(container)).not.toContain("This must not be inserted.");
  });

  it("pastes markdown clipboard text as rich editor content", async () => {
    const { container } = render(<MdKitEditor value="" onChange={() => {}} />);
    const editor = await getEditorElement(container);

    await act(async () => {
      editor.focus();
      pasteIntoEditor(editor, {
        "text/html":
          "<pre><code># Pasted heading\n\n- first\n- second</code></pre>",
        "text/plain": "# Pasted heading\n\n- first\n- second",
      });
    });

    await waitFor(() => {
      expect(container.querySelector(".ProseMirror h1")).toHaveTextContent(
        "Pasted heading",
      );
      expect(container.querySelector(".ProseMirror li")).toHaveTextContent(
        "first",
      );
    });

    expect(container.querySelector(".ProseMirror pre")).toBeNull();
  });

  it("focuses the editor when the fill-height background is clicked", async () => {
    const onFocusChange = vi.fn();
    const onDebugEvent = vi.fn();

    const { container } = render(
      <MdKitEditor
        fillHeight
        value="Stored document"
        onChange={() => {}}
        onDebugEvent={onDebugEvent}
        onFocusChange={onFocusChange}
      />,
    );

    const surface = await waitFor(() => {
      const element = container.querySelector(".mp-lb-mdkit-editor-surface");

      if (!(element instanceof HTMLElement)) {
        throw new Error("Expected editor surface to render.");
      }

      return element;
    });

    const editor = container.querySelector(".ProseMirror");

    if (!(editor instanceof HTMLElement)) {
      throw new Error("Expected TipTap to render a ProseMirror editor.");
    }

    const clientY = editor.getBoundingClientRect().bottom + 48;

    fireEvent.pointerDown(surface, { clientY });
    fireEvent.pointerUp(surface, { clientY });
    fireEvent.click(surface);

    await waitFor(() => {
      expect(document.activeElement).toBe(editor);
      expect(onFocusChange).toHaveBeenCalledWith(true);
      expect(onDebugEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            requestedPosition: expect.any(Number),
            selectionAnchor: "Stored document".length + 1,
          }),
          type: "focus-at-position-after",
        }),
      );
    });
  });

  it("blurs the editor when non-focusable page chrome is clicked", async () => {
    const onFocusChange = vi.fn();

    const { container } = render(
      <div>
        <div data-testid="page-chrome" />
        <MdKitEditor
          value="Text that can be selected"
          onChange={() => {}}
          onFocusChange={onFocusChange}
        />
      </div>,
    );

    const editor = await waitFor(() => {
      const element = container.querySelector(".ProseMirror");

      if (!(element instanceof HTMLElement)) {
        throw new Error("Expected TipTap to render a ProseMirror editor.");
      }

      return element;
    });

    await act(async () => {
      editor.focus();
    });

    await waitFor(() => {
      expect(onFocusChange).toHaveBeenCalledWith(true);
    });

    fireEvent.click(screen.getByTestId("page-chrome"));

    await waitFor(() => {
      expect(onFocusChange).toHaveBeenCalledWith(false);
    });
  });

  it("does not force a ProseMirror blur during native input pointerdown", async () => {
    const onFocusChange = vi.fn();

    const { container } = render(
      <div>
        <input aria-label="External input" />
        <MdKitEditor
          value="Text that can be selected"
          onChange={() => {}}
          onFocusChange={onFocusChange}
        />
      </div>,
    );

    const editor = await waitFor(() => {
      const element = container.querySelector(".ProseMirror");

      if (!(element instanceof HTMLElement)) {
        throw new Error("Expected TipTap to render a ProseMirror editor.");
      }

      return element;
    });

    await act(async () => {
      editor.focus();
    });

    await waitFor(() => {
      expect(onFocusChange).toHaveBeenCalledWith(true);
    });

    onFocusChange.mockClear();
    fireEvent.pointerDown(screen.getByLabelText("External input"));

    expect(onFocusChange).not.toHaveBeenCalledWith(false);
  });

  it("does not install document search by default", async () => {
    const { container } = render(
      <MdKitEditor value="Findable text" onChange={() => {}} />,
    );

    await waitFor(() => {
      expect(container.querySelector(".ProseMirror")).toBeTruthy();
    });

    await act(async () => {
      const editor = container.querySelector(".ProseMirror");

      if (!(editor instanceof HTMLElement)) {
        throw new Error("Expected TipTap to render a ProseMirror editor.");
      }

      editor.focus();
    });

    fireEvent.keyDown(document, { ctrlKey: true, key: "f" });

    expect(screen.queryByRole("searchbox", { name: "Search document" })).toBe(
      null,
    );
  });

  it("opens optional document search from the find shortcut", async () => {
    const { container } = render(
      <MdKitEditor
        search
        value="First paragraph. Second paragraph."
        onChange={() => {}}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector(".ProseMirror")).toBeTruthy();
    });

    await act(async () => {
      const editor = container.querySelector(".ProseMirror");

      if (!(editor instanceof HTMLElement)) {
        throw new Error("Expected TipTap to render a ProseMirror editor.");
      }

      editor.focus();
    });

    fireEvent.keyDown(document, { metaKey: true, key: "f" });

    const searchInput = await screen.findByRole("searchbox", {
      name: "Search document",
    });

    fireEvent.change(searchInput, { target: { value: "paragraph" } });

    await waitFor(() => {
      expect(screen.getByText("1 of 2")).toBeTruthy();
      expect(document.activeElement).toBe(searchInput);
      expect(
        container.querySelector(".mp-lb-mdkit-search-match-active")
          ?.textContent,
      ).toBe("paragraph");
    });

    fireEvent.click(screen.getByRole("button", { name: "Next match" }));

    await waitFor(() => {
      expect(screen.getByText("2 of 2")).toBeTruthy();
    });
  });
});
