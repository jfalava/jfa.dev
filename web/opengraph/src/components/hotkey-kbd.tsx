import { Kbd, KbdGroup } from "@jfa.dev/common/ui";
import { detectPlatform, formatForDisplay, parseHotkey } from "@tanstack/react-hotkeys";
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
      {formatForDisplay(parseHotkey(hotkey, platform), { platform, separatorToken: " " })
        .split(" ")
        .map((token: string) => (
          <Kbd key={token}>{token}</Kbd>
        ))}
    </KbdGroup>
  );
}
