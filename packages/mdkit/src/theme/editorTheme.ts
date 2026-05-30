import type { CSSProperties } from "react";

export type MdKitEditorTheme = {
  background: string;
  blockGap: string;
  border: string;
  codeBackground: string;
  codeRadius: string;
  fontFamily: string;
  fontSize: string;
  foreground: string;
  lineHeight: string;
  link: string;
  muted: string;
  mutedForeground: string;
  surfacePadding: string;
};

export type MdKitEditorThemeStyle = CSSProperties &
  Record<`--mp-lb-mdkit-${string}`, string>;

export const defaultMdKitEditorTheme: MdKitEditorTheme = {
  background: "#ffffff",
  blockGap: "0.72em",
  border: "#d8dee8",
  codeBackground: "#eef1f4",
  codeRadius: "0.35rem",
  fontFamily: "inherit",
  fontSize: "16px",
  foreground: "#18212f",
  lineHeight: "1.55",
  link: "#4f46e5",
  muted: "#eef1f4",
  mutedForeground: "#5b6472",
  surfacePadding: "1rem",
};

export const darkMdKitEditorTheme: MdKitEditorTheme = {
  background: "#0b1220",
  blockGap: "0.72em",
  border: "#314158",
  codeBackground: "#111827",
  codeRadius: "0.35rem",
  fontFamily: "inherit",
  fontSize: "16px",
  foreground: "#e5edf7",
  lineHeight: "1.55",
  link: "#38bdf8",
  muted: "#172033",
  mutedForeground: "#94a3b8",
  surfacePadding: "1rem",
};

export const createMdKitEditorThemeStyle = (
  theme: MdKitEditorTheme,
): MdKitEditorThemeStyle => ({
  "--mp-lb-mdkit-background": theme.background,
  "--mp-lb-mdkit-block-gap": theme.blockGap,
  "--mp-lb-mdkit-border": theme.border,
  "--mp-lb-mdkit-code-background": theme.codeBackground,
  "--mp-lb-mdkit-code-radius": theme.codeRadius,
  "--mp-lb-mdkit-code-block-radius": theme.codeRadius,
  "--mp-lb-mdkit-font-family": theme.fontFamily,
  "--mp-lb-mdkit-font-size": theme.fontSize,
  "--mp-lb-mdkit-foreground": theme.foreground,
  "--mp-lb-mdkit-line-height": theme.lineHeight,
  "--mp-lb-mdkit-link": theme.link,
  "--mp-lb-mdkit-muted": theme.muted,
  "--mp-lb-mdkit-muted-foreground": theme.mutedForeground,
  "--mp-lb-mdkit-quote-border-color": theme.border,
  "--mp-lb-mdkit-surface-padding": theme.surfacePadding,
});
