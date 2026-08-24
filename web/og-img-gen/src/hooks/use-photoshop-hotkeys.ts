import { useEffect, useRef } from "react";

export interface PhotoshopHotkeyHandlers {
  onToolSelect?: (tool: "select" | "hand" | "pipette") => void;
  onAddText?: () => void;
  onAddGeometry?: () => void;
  onAddImage?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onRename?: () => void;
  onRefresh?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onImport?: () => void;
  onExportZip?: () => void;
  onExportPng?: () => void;
  onNew?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onToggleVisibility?: () => void;
  onToggleHelp?: () => void;
  onHelpHoldChange?: (isHeld: boolean) => void;
}

function isTypingInInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  return !!target.closest("input, textarea, select, [contenteditable=true]");
}

function isMod(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey;
}

export function usePhotoshopHotkeys(
  handlers: PhotoshopHotkeyHandlers,
  currentTool?: "select" | "hand" | "pipette",
): void {
  const holdTimeoutRef = useRef<number | null>(null);
  const isHelpHeldRef = useRef(false);
  const prevToolRef = useRef<"select" | "hand" | "pipette" | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const typing = isTypingInInput(event.target);
      const mod = isMod(event);
      const alt = event.altKey;
      const shift = event.shiftKey;
      const key = event.key.toLowerCase();
      const code = event.code.toLowerCase();

      const isHelpTrigger =
        event.key === "?" ||
        (event.key === "/" && shift) ||
        event.key === "F1" ||
        (event.key === "/" && mod) ||
        (code === "slash" && shift);

      if (isHelpTrigger) {
        if (event.key === "F1") {
          event.preventDefault();
        }
        // Start hold preview timer for "?" (Shift+/)
        if (
          (event.key === "?" || (event.key === "/" && shift) || code === "slash") &&
          !isHelpHeldRef.current &&
          holdTimeoutRef.current === null
        ) {
          holdTimeoutRef.current = window.setTimeout(() => {
            isHelpHeldRef.current = true;
            handlers.onHelpHoldChange?.(true);
          }, 400);
        }
        return;
      }

      if (isHelpHeldRef.current) {
        return;
      }

      // Space hold for Hand
      if (code === "space" && !typing && !mod && !shift) {
        if (prevToolRef.current === null && currentTool) {
          prevToolRef.current = currentTool;
          handlers.onToolSelect?.("hand");
        } else if (prevToolRef.current === null) {
          prevToolRef.current = "select";
          handlers.onToolSelect?.("hand");
        }
        event.preventDefault();
        return;
      }

      // Single-key tools — only when not typing and no Mod/Alt
      if (!typing && !mod && !alt) {
        if (key === "v" && !shift) {
          handlers.onToolSelect?.("select");
          event.preventDefault();
          return;
        }
        if (key === "h" && !shift) {
          handlers.onToolSelect?.("hand");
          event.preventDefault();
          return;
        }
        if (key === "t" && !shift) {
          handlers.onAddText?.();
          event.preventDefault();
          return;
        }
        if (key === "u" && !shift) {
          handlers.onAddGeometry?.();
          event.preventDefault();
          return;
        }
        if (key === "p" && !shift) {
          handlers.onAddImage?.();
          event.preventDefault();
          return;
        }
        if (key === "i" && !shift) {
          handlers.onToolSelect?.("pipette");
          event.preventDefault();
          return;
        }
        if (key === "g" && !shift) {
          handlers.onToolSelect?.("pipette");
          event.preventDefault();
          return;
        }
        if (key === "delete" || key === "backspace") {
          handlers.onDelete?.();
          event.preventDefault();
          return;
        }
        if (key === "f2") {
          handlers.onRename?.();
          event.preventDefault();
          return;
        }
        // Toggle visibility — bare "," (comma) avoids Mod+, browser settings
        if ((key === "," || code === "comma") && !shift) {
          handlers.onToggleVisibility?.();
          event.preventDefault();
          return;
        }
      }

      // Alt+ combos — file/edit without clashing with browser Mod+ (Cmd+,/S/N/O/R)
      // Use code for letters to avoid Option-char issues on macOS (Alt+R -> ®)
      if (alt && !mod && !typing) {
        if (code === "keyr" && !shift) {
          handlers.onRefresh?.();
          event.preventDefault();
          return;
        }
        if (code === "keyn" && !shift) {
          handlers.onNew?.();
          event.preventDefault();
          return;
        }
        if (code === "keyo" && !shift) {
          handlers.onImport?.();
          event.preventDefault();
          return;
        }
        if (code === "keys" && !shift) {
          handlers.onExportZip?.();
          event.preventDefault();
          return;
        }
        if (code === "keys" && shift) {
          handlers.onExportPng?.();
          event.preventDefault();
          return;
        }
        // Toggle visibility also via Alt+, if preferred
        if ((code === "comma" || key === ",") && !shift) {
          handlers.onToggleVisibility?.();
          event.preventDefault();
          return;
        }
      }

      // Mod+Shift+ fallbacks — add Shift to avoid browser clash (e.g. Mod+, -> Mod+Shift+,)
      if (mod && shift && !alt && !typing) {
        if (code === "keyr" || key === "r") {
          handlers.onRefresh?.();
          event.preventDefault();
          return;
        }
        if (code === "keyn" || key === "n") {
          handlers.onNew?.();
          event.preventDefault();
          return;
        }
        if (code === "keyo" || key === "o") {
          handlers.onImport?.();
          event.preventDefault();
          return;
        }
        if (code === "keys" || key === "s") {
          // Shift distinguishes ZIP vs PNG — check original shift already true here
          // For Mod+Shift+S we map to Export ZIP as Shift fallback (PNG is Alt+Shift+S primary)
          handlers.onExportZip?.();
          event.preventDefault();
          return;
        }
        if ((code === "comma" || key === "," || key === "<") && !alt) {
          handlers.onToggleVisibility?.();
          event.preventDefault();
          return;
        }
      }

      // Mod+ combos (undo/redo/duplicate/zoom — safe, widely overridden)
      if (mod && !alt) {
        if (key === "z" && !shift) {
          handlers.onUndo?.();
          event.preventDefault();
          return;
        }
        if ((key === "z" && shift) || key === "y") {
          handlers.onRedo?.();
          event.preventDefault();
          return;
        }
        if (key === "j" && !shift) {
          handlers.onDuplicate?.();
          event.preventDefault();
          return;
        }
        if ((key === "+" || key === "=" || code === "equal") && !shift) {
          handlers.onZoomIn?.();
          event.preventDefault();
          return;
        }
        if (key === "+" || (key === "=" && shift) || code === "equal") {
          // Shift+= is +
          if (shift) {
            handlers.onZoomIn?.();
            event.preventDefault();
            return;
          }
        }
        if (key === "-" || key === "_" || code === "minus") {
          handlers.onZoomOut?.();
          event.preventDefault();
          return;
        }
        if (key === "0" && !shift) {
          handlers.onZoomReset?.();
          event.preventDefault();
          return;
        }
      }

      // Zoom via Mod+Plus/Minus with code
      if (mod && code === "equal") {
        handlers.onZoomIn?.();
        event.preventDefault();
        return;
      }
      if (mod && code === "minus") {
        handlers.onZoomOut?.();
        event.preventDefault();
      }
    }

    function handleKeyUp(event: KeyboardEvent): void {
      const key = event.key.toLowerCase();
      const code = event.code.toLowerCase();

      if (isHelpHeldRef.current) {
        isHelpHeldRef.current = false;
        handlers.onHelpHoldChange?.(false);
        if (holdTimeoutRef.current !== null) {
          window.clearTimeout(holdTimeoutRef.current);
          holdTimeoutRef.current = null;
        }
        return;
      }

      if (holdTimeoutRef.current !== null) {
        window.clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
        const wasHelpQuickTap =
          event.key === "?" ||
          (event.key === "/" && event.shiftKey) ||
          event.key === "F1" ||
          key === "?" ||
          code === "slash";
        if (wasHelpQuickTap) {
          handlers.onToggleHelp?.();
          event.preventDefault();
          return;
        }
      }

      if (code === "space" && prevToolRef.current !== null) {
        const prev = prevToolRef.current;
        prevToolRef.current = null;
        if (prev) {
          handlers.onToolSelect?.(prev);
        }
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (holdTimeoutRef.current !== null) {
        window.clearTimeout(holdTimeoutRef.current);
      }
    };
  }, [handlers, currentTool]);
}
