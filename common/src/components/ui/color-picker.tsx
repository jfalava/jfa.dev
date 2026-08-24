"use client";

import { Button } from "./button";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

import { Palette, X } from "lucide-react";
import { useEffect, useState } from "react";
import { HexColorPicker } from "react-colorful";

export function ColorPicker({
  color,
  onChange,
  onRemove,
  id,
  compact,
  className,
  ariaLabel,
}: {
  color: string;
  onChange: (color: string) => void;
  onRemove?: () => void;
  id?: string;
  compact?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [colorDraft, setColorDraft] = useState({ source: color, value: color });
  const internalColor = colorDraft.source === color ? colorDraft.value : color;
  const setInternalColor = (value: string) => setColorDraft({ source: color, value });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (internalColor !== color) {
        onChange(internalColor);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [internalColor, color, onChange]);

  // For toolbox overlapping swatches, the trigger itself must be absolutely positioned
  // relative to the toolbox container, not to an extra wrapper. So when onRemove is absent
  // (toolbox case), render Popover directly without outer relative div.
  if (onRemove) {
    return (
      <div className="relative">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger
            id={id}
            aria-label={ariaLabel ?? "Open color picker"}
            className={
              compact
                ? `flex size-7 items-center justify-center rounded-md border border-border bg-background p-0.5 shadow-xs outline-none transition-colors hover:border-primary/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 ${className ?? ""}`
                : `relative h-10 w-full rounded-md border border-input p-0 ${className ?? ""}`
            }
            style={compact ? undefined : { backgroundColor: internalColor }}
          >
            {compact ? (
              <span
                aria-hidden="true"
                className="size-full rounded-[4px] border border-black/10 dark:border-white/10"
                style={{ backgroundColor: internalColor }}
              />
            ) : (
              <span className="sr-only">Open color picker</span>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <HexColorPicker color={internalColor} onChange={setInternalColor} />
            <div className="flex items-center gap-2 p-3">
              <Input
                value={internalColor}
                onChange={(event) => setInternalColor(event.target.value)}
                className="h-8 w-24 font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="Close color picker"
                onPress={() => setIsOpen(false)}
              >
                <Palette className="h-4 w-4" />
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <button
          type="button"
          aria-label="Remove color"
          title="Remove color"
          onClick={onRemove}
          className="absolute top-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/20 transition-colors hover:bg-black/40"
        >
          <X className="h-3 w-3 text-white" />
        </button>
      </div>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        id={id}
        aria-label={ariaLabel ?? "Open color picker"}
        className={
          compact
            ? `flex size-7 items-center justify-center rounded-md border border-border bg-background p-0.5 shadow-xs outline-none transition-colors hover:border-primary/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 ${className ?? ""}`
            : `relative h-10 w-full rounded-md border border-input p-0 ${className ?? ""}`
        }
        style={compact ? undefined : { backgroundColor: internalColor }}
      >
        {compact ? (
          <span
            aria-hidden="true"
            className="size-full rounded-[4px] border border-black/10 dark:border-white/10"
            style={{ backgroundColor: internalColor }}
          />
        ) : (
          <span className="sr-only">Open color picker</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <HexColorPicker color={internalColor} onChange={setInternalColor} />
        <div className="flex items-center gap-2 p-3">
          <Input
            value={internalColor}
            onChange={(event) => setInternalColor(event.target.value)}
            className="h-8 w-24 font-mono"
          />
          <Button
            variant="outline"
            size="icon"
            aria-label="Close color picker"
            onPress={() => setIsOpen(false)}
          >
            <Palette className="h-4 w-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export function ColorField({ label, value, onChange }: ColorFieldProps) {
  const normalized = value.startsWith("#") ? value : `#${value}`;
  return (
    <div className="flex flex-col gap-1 text-[10px] leading-none">
      <span className="font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-md border border-input bg-input/20 px-2 py-1.5">
        <ColorPicker compact color={normalized} onChange={onChange} ariaLabel={label} />
        <span className="flex-1 text-right font-mono text-xs text-foreground">
          {normalized.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
