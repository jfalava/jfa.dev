import { ColorPicker, Input } from "@jfa.dev/common/ui";
import { useState } from "react";

import { PreviewShell } from "./preview-shell";

const FONT_FAMILIES = ["Pretendard", "Zilla Slab", "Google Sans Code"] as const;
type FontFamily = (typeof FONT_FAMILIES)[number];
const FONT_FAMILY_SET = new Set<string>(FONT_FAMILIES);
function isFontFamily(value: string): value is FontFamily {
  return FONT_FAMILY_SET.has(value);
}
const WEIGHT_OPTIONS = [
  [400, "Regular"],
  [500, "Medium"],
  [600, "Semibold"],
  [700, "Bold"],
  [800, "Extra bold"],
] as const;

export function TextPreview() {
  const [text, setText] = useState("Make it unmistakable.");
  const [fontFamily, setFontFamily] = useState<(typeof FONT_FAMILIES)[number]>("Pretendard");
  const [size, setSize] = useState("56");
  const [weight, setWeight] = useState("600");
  const [align, setAlign] = useState<"left" | "center" | "right">("left");
  const [color, setColor] = useState("#2F302C");

  const normalizedColor = color.startsWith("#") ? color : `#${color}`;
  const isValidColor = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(normalizedColor);
  const swatchColor = isValidColor ? normalizedColor : "#2F302C";

  return (
    <PreviewShell
      label="Typography — live controls"
      caption="Size and Weight share a line. Alignment shows Left, Center, and Right — the active choice is highlighted."
    >
      <div className="space-y-3 p-4">
        <label className="block text-[10px] text-muted-foreground" htmlFor="preview-text">
          Text
        </label>
        <textarea
          id="preview-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="mt-1 min-h-20 w-full resize-y rounded-md border border-input bg-input/20 px-2 py-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          placeholder="Make it unmistakable."
        />
        <label className="block text-[10px] text-muted-foreground" htmlFor="preview-font">
          <span className="block">Font family</span>
          <select
            id="preview-font"
            value={fontFamily}
            onChange={(event) => {
              const value = event.target.value;
              if (isFontFamily(value)) {
                setFontFamily(value);
              }
            }}
            className="mt-1 flex h-7 w-full items-center rounded-md border border-input bg-input/20 px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {FONT_FAMILIES.map((family) => (
              <option key={family} value={family}>
                {family}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[10px] leading-none">
            <span className="font-medium text-muted-foreground">Size</span>
            <span className="flex h-7 items-center gap-1 rounded-md border border-input bg-input/20 px-2 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
              <input
                aria-label="Font size"
                inputMode="numeric"
                value={size}
                onChange={(event) => {
                  const next = event.target.value;
                  if (next !== "" && !/^\d*\.?\d*$/.test(next)) {
                    return;
                  }
                  setSize(next);
                }}
                className="w-full min-w-0 bg-transparent text-right text-xs outline-none"
                placeholder="56"
              />
              <span className="shrink-0 text-xs text-muted-foreground">px</span>
            </span>
          </label>
          <label className="flex flex-col gap-1 text-[10px] leading-none">
            <span className="font-medium text-muted-foreground">Weight</span>
            <select
              aria-label="Font weight"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              className="flex h-7 w-full items-center rounded-md border border-input bg-input/20 px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {WEIGHT_OPTIONS.map(([value, label]) => (
                <option key={value} value={String(value)}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {(["left", "center", "right"] as const).map((value) => {
            const isActive = align === value;
            const label = value === "left" ? "Left" : value === "center" ? "Center" : "Right";
            return (
              <button
                key={value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setAlign(value)}
                className={`inline-flex h-6 items-center justify-center gap-1.5 rounded-md border px-2 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                  isActive
                    ? "border-primary/30 bg-primary/10 font-medium text-primary"
                    : "border-input bg-input/20 hover:bg-input/40"
                }`}
              >
                ≡ {label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-input/20 px-2 py-1.5 text-[10px] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
          <label className="font-medium text-muted-foreground" htmlFor="preview-color">
            Color
          </label>
          <span className="ml-auto flex items-center gap-2">
            <ColorPicker
              compact
              color={swatchColor}
              onChange={setColor}
              ariaLabel="Text color"
              className="!size-5 !rounded-sm !p-0.5"
            />
            <Input
              id="preview-color"
              aria-label="Text color"
              className="h-7 w-24 bg-transparent px-1 text-right font-mono text-xs shadow-none"
              value={color}
              onChange={(event) => {
                const next = event.target.value;
                if (next.length > 7) {
                  return;
                }
                if (next !== "" && !/^#?[0-9a-fA-F]*$/.test(next)) {
                  return;
                }
                setColor(next);
              }}
              placeholder="#2F302C"
            />
          </span>
        </div>
      </div>
    </PreviewShell>
  );
}

export function PositionPreview() {
  const [pos, setPos] = useState({ x: "759", y: "70", w: "282.75", h: "282.75" });

  const handleChange = (key: keyof typeof pos, value: string) => {
    if (value !== "" && !/^-?\d*\.?\d*$/.test(value)) {
      return;
    }
    setPos((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <PreviewShell
      label="Position & size — labels on top"
      caption="Each field shows its label above the value, so large numbers stay readable."
    >
      <div className="grid grid-cols-2 gap-2 p-4">
        {(["x", "y", "w", "h"] as const).map((key) => (
          <label key={key} className="flex flex-col gap-1 text-[10px] leading-none">
            <span className="font-medium text-muted-foreground">{key.toUpperCase()}</span>
            <span className="flex h-7 items-center justify-end rounded-md border border-input bg-input/20 px-2 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
              <input
                aria-label={key.toUpperCase()}
                inputMode="decimal"
                value={pos[key]}
                onChange={(event) => handleChange(key, event.target.value)}
                className="w-full min-w-0 bg-transparent text-right text-xs outline-none"
                placeholder="0"
              />
            </span>
          </label>
        ))}
      </div>
    </PreviewShell>
  );
}
