import type { Editor } from "@tiptap/react";
import type { BubbleMenuProps } from "@tiptap/react/menus";
import { describe, expect, it, vi } from "vitest";
import { shouldShowMarkdownBubbleMenu } from "./MarkdownBubbleMenu";

type BubbleMenuShouldShowProps = Parameters<
  NonNullable<BubbleMenuProps["shouldShow"]>
>[0];

const createShouldShowProps = ({
  activeElement,
  editorIsEditable = true,
  selectionEmpty = false,
  selectedText = "selected text",
  viewHasFocus = true,
}: {
  activeElement?: HTMLElement;
  editorIsEditable?: boolean;
  selectionEmpty?: boolean;
  selectedText?: string;
  viewHasFocus?: boolean;
} = {}): BubbleMenuShouldShowProps => {
  const element = document.createElement("div");

  if (activeElement) {
    element.append(activeElement);
    document.body.append(element);
    activeElement.focus();
  }

  return {
    editor: {
      isEditable: editorIsEditable,
    } as Editor,
    element,
    from: 1,
    oldState: undefined,
    state: {
      doc: {
        textBetween: vi.fn(() => selectedText),
      },
      selection: {
        empty: selectionEmpty,
      },
    },
    to: 14,
    view: {
      hasFocus: vi.fn(() => viewHasFocus),
    },
  } as unknown as BubbleMenuShouldShowProps;
};

describe("shouldShowMarkdownBubbleMenu", () => {
  it("shows for non-empty text selections while the editor has focus", () => {
    expect(shouldShowMarkdownBubbleMenu(createShouldShowProps())).toBe(true);
  });

  it("hides selected text when the editor and menu are not focused", () => {
    expect(
      shouldShowMarkdownBubbleMenu(
        createShouldShowProps({
          viewHasFocus: false,
        }),
      ),
    ).toBe(false);
  });

  it("stays visible while focus is inside the menu", () => {
    const button = document.createElement("button");

    expect(
      shouldShowMarkdownBubbleMenu(
        createShouldShowProps({
          activeElement: button,
          viewHasFocus: false,
        }),
      ),
    ).toBe(true);
  });

  it("hides empty selections and selections without text", () => {
    expect(
      shouldShowMarkdownBubbleMenu(
        createShouldShowProps({
          selectionEmpty: true,
        }),
      ),
    ).toBe(false);

    expect(
      shouldShowMarkdownBubbleMenu(
        createShouldShowProps({
          selectedText: "",
        }),
      ),
    ).toBe(false);
  });

  it("hides when the editor is read-only", () => {
    expect(
      shouldShowMarkdownBubbleMenu(
        createShouldShowProps({
          editorIsEditable: false,
        }),
      ),
    ).toBe(false);
  });
});
