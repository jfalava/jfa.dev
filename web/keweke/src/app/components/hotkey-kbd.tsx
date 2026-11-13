import { Kbd, KbdGroup, kbdVariants } from "@jfa.dev/common/ui";
import { detectPlatform, formatForDisplay, parseHotkey } from "@tanstack/react-hotkeys";
import type { VariantProps } from "class-variance-authority";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

type KbdVariantProps = VariantProps<typeof kbdVariants>;

interface HotkeyKbdProps {
  className?: string;
  hotkey: string;
  size?: KbdVariantProps["size"];
  variant?: KbdVariantProps["variant"];
}

export function HotkeyKbd({ className, hotkey, size, variant }: HotkeyKbdProps) {
  const platform = useSyncExternalStore(subscribe, detectPlatform, () => "linux" as const);

  return (
    <KbdGroup className={className}>
      {formatForDisplay(parseHotkey(hotkey, platform), { platform, separatorToken: " " })
        .split(" ")
        .map((token) => (
          <Kbd key={token} size={size} variant={variant}>
            {token}
          </Kbd>
        ))}
    </KbdGroup>
  );
}
