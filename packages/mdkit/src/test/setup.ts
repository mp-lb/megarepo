import "@testing-library/jest-dom/vitest";

if (!window.matchMedia) {
  window.matchMedia = () =>
    ({
      addEventListener: () => undefined,
      addListener: () => undefined,
      dispatchEvent: () => false,
      matches: false,
      media: "",
      onchange: null,
      removeEventListener: () => undefined,
      removeListener: () => undefined,
    }) as MediaQueryList;
}

const emptyDomRect = {
  bottom: 0,
  height: 0,
  left: 0,
  right: 0,
  top: 0,
  width: 0,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as DOMRect;

if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () => emptyDomRect;
}

if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () =>
    ({
      0: emptyDomRect,
      item: (index: number) => (index === 0 ? emptyDomRect : null),
      length: 1,
    }) as unknown as DOMRectList;
}
