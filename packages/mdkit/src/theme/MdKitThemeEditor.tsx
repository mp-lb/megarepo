import type { MdKitEditorTheme } from "./editorTheme";

export type MdKitThemeEditorProps = {
  className?: string;
  onChange: (theme: MdKitEditorTheme) => void;
  onReset?: () => void;
  theme: MdKitEditorTheme;
};

export const MdKitThemeEditor = ({
  className,
  onChange,
  onReset,
  theme,
}: MdKitThemeEditorProps) => {
  const updateTheme = (patch: Partial<MdKitEditorTheme>) => {
    onChange({
      ...theme,
      ...patch,
    });
  };

  return (
    <div className={["mp-lb-mdkit-theme-editor", className].filter(Boolean).join(" ")}>
      <label>
        <span>Background</span>
        <input
          type="color"
          value={theme.background}
          onChange={(event) => updateTheme({ background: event.target.value })}
        />
      </label>
      <label>
        <span>Text</span>
        <input
          type="color"
          value={theme.foreground}
          onChange={(event) => updateTheme({ foreground: event.target.value })}
        />
      </label>
      <label>
        <span>Link</span>
        <input
          type="color"
          value={theme.link}
          onChange={(event) => updateTheme({ link: event.target.value })}
        />
      </label>
      <label>
        <span>Code</span>
        <input
          type="color"
          value={theme.codeBackground}
          onChange={(event) =>
            updateTheme({
              codeBackground: event.target.value,
              muted: event.target.value,
            })
          }
        />
      </label>
      <label>
        <span>Font size</span>
        <input
          type="range"
          min="13"
          max="22"
          value={Number.parseInt(theme.fontSize, 10)}
          onChange={(event) =>
            updateTheme({ fontSize: `${event.target.value}px` })
          }
        />
      </label>
      <label>
        <span>Font</span>
        <select
          value={theme.fontFamily}
          onChange={(event) => updateTheme({ fontFamily: event.target.value })}
        >
          <option value="inherit">App default</option>
          <option value="ui-serif, Georgia, Cambria, serif">Serif</option>
          <option value="ui-sans-serif, system-ui, sans-serif">Sans</option>
          <option value="ui-monospace, SFMono-Regular, Menlo, monospace">
            Mono
          </option>
        </select>
      </label>
      <label>
        <span>Line height</span>
        <input
          type="range"
          min="1.2"
          max="2.2"
          step="0.1"
          value={theme.lineHeight}
          onChange={(event) => updateTheme({ lineHeight: event.target.value })}
        />
      </label>
      <label>
        <span>Padding</span>
        <input
          type="range"
          min="0"
          max="32"
          value={Number.parseInt(theme.surfacePadding, 10)}
          onChange={(event) =>
            updateTheme({ surfacePadding: `${event.target.value}px` })
          }
        />
      </label>
      <label>
        <span>Code radius</span>
        <input
          type="range"
          min="0"
          max="16"
          value={Number.parseInt(theme.codeRadius, 10)}
          onChange={(event) =>
            updateTheme({ codeRadius: `${event.target.value}px` })
          }
        />
      </label>
      {onReset ? (
        <button type="button" onClick={onReset}>
          Reset style
        </button>
      ) : null}
    </div>
  );
};
