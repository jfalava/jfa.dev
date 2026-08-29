import { Kbd, KbdGroup, kbdVariants } from "@jfa.dev/common/ui";
import { detectPlatform, formatForDisplay } from "@tanstack/react-hotkeys";
import { useSyncExternalStore } from "react";
import type { VariantProps } from "class-variance-authority";

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
      {formatForDisplay(hotkey, { platform, separatorToken: " " })
        .split(" ")
        .map((token) => (
          <Kbd key={token} size={size} variant={variant}>
            {token}
          </Kbd>
        ))}
    </KbdGroup>
  );
}
