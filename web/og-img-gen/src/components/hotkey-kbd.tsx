import { Kbd, KbdGroup } from "@jfa.dev/common/ui";
import { detectPlatform, formatForDisplay } from "@tanstack/react-hotkeys";
import { useSyncExternalStore } from "react";

const subscribe = (): (() => void) => (): void => {};

interface HotkeyKbdProps {
  className?: string;
  hotkey: string;
}

export function HotkeyKbd({ className, hotkey }: HotkeyKbdProps) {
  const platform = useSyncExternalStore(subscribe, detectPlatform, (): "linux" => "linux");

  return (
    <KbdGroup className={className}>
      {formatForDisplay(hotkey, { platform, separatorToken: " " })
        .split(" ")
        .map((token: string) => (
          <Kbd key={token}>{token}</Kbd>
        ))}
    </KbdGroup>
  );
}
