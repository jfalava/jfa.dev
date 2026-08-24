import {
  Copy,
  Download,
  Eye,
  FileDown,
  FileUp,
  Hand,
  Image as ImageIcon,
  MousePointer2,
  Palette,
  Pencil,
  Pipette,
  Plus,
  RefreshCw,
  Square,
  Trash2,
  Type,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

export type ShortcutCategory = "Tools" | "Edit" | "File" | "View" | "Layers" | "Help";

export interface PhotoshopShortcut {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  hotkey: string; // display string for Kbd, e.g. "V", "Mod+J", "Delete"
  keys: string[]; // normalized for matching, e.g. ["v"], ["mod+j"]
  category: ShortcutCategory;
}

// Photoshop-like map — single keys for tools, Mod+ combos for actions
// Mod = Cmd on Mac, Ctrl on Windows/Linux (via @tanstack/react-hotkeys format)
export const PHOTOSHOP_SHORTCUTS: PhotoshopShortcut[] = [
  // Tools — single keys like Photoshop (no Mod)
  {
    id: "tool-select",
    label: "Move / Select",
    description: "Select and move layers",
    icon: MousePointer2,
    hotkey: "V",
    keys: ["v"],
    category: "Tools",
  },
  {
    id: "tool-hand",
    label: "Hand",
    description: "Pan canvas (hold Space)",
    icon: Hand,
    hotkey: "H",
    keys: ["h", "space"],
    category: "Tools",
  },
  {
    id: "tool-text",
    label: "Text",
    description: "Add text layer",
    icon: Type,
    hotkey: "T",
    keys: ["t"],
    category: "Tools",
  },
  {
    id: "tool-shape",
    label: "Shape",
    description: "Add rectangle / ellipse",
    icon: Square,
    hotkey: "U",
    keys: ["u"],
    category: "Tools",
  },
  {
    id: "tool-image",
    label: "Image",
    description: "Place image",
    icon: ImageIcon,
    hotkey: "P",
    keys: ["p"],
    category: "Tools",
  },
  {
    id: "tool-pipette",
    label: "Eyedropper",
    description: "Pick color",
    icon: Pipette,
    hotkey: "I",
    keys: ["i"],
    category: "Tools",
  },
  {
    id: "tool-palette",
    label: "Fill / Swatches",
    description: "Edit fill color",
    icon: Palette,
    hotkey: "G",
    keys: ["g"],
    category: "Tools",
  },
  // Edit
  {
    id: "edit-undo",
    label: "Undo",
    description: "Undo last change",
    icon: Undo2,
    hotkey: "Mod+Z",
    keys: ["mod+z"],
    category: "Edit",
  },
  {
    id: "edit-redo",
    label: "Redo",
    description: "Redo last change",
    icon: Redo2,
    hotkey: "Mod+Shift+Z",
    keys: ["mod+shift+z", "mod+y"],
    category: "Edit",
  },
  {
    id: "edit-duplicate",
    label: "Duplicate",
    description: "Duplicate selected layer",
    icon: Copy,
    hotkey: "Mod+J",
    keys: ["mod+j"],
    category: "Edit",
  },
  {
    id: "edit-delete",
    label: "Delete",
    description: "Delete selected layer",
    icon: Trash2,
    hotkey: "Delete",
    keys: ["delete", "backspace"],
    category: "Edit",
  },
  {
    id: "edit-rename",
    label: "Rename",
    description: "Rename selected layer",
    icon: Pencil,
    hotkey: "F2",
    keys: ["f2", "enter"],
    category: "Edit",
  },
  {
    id: "edit-refresh",
    label: "Refresh",
    description: "Reset layer position",
    icon: RefreshCw,
    hotkey: "Alt+R",
    keys: ["alt+r", "mod+shift+r"],
    category: "Edit",
  },
  // File — Alt+ avoids browser File menu (Mod+N/O/S/R clash with new/open/save/reload)
  // Shift aliases (Mod+Shift+) also accepted as low-hassle non-clashing fallback per request
  {
    id: "file-new",
    label: "New",
    description: "New blank canvas",
    icon: Plus,
    hotkey: "Alt+N",
    keys: ["alt+n", "mod+shift+n"],
    category: "File",
  },
  {
    id: "file-import",
    label: "Import",
    description: "Import .ogproj archive",
    icon: FileUp,
    hotkey: "Alt+O",
    keys: ["alt+o", "mod+shift+o"],
    category: "File",
  },
  {
    id: "file-export-zip",
    label: "Export ZIP",
    description: "Export project as .ogproj",
    icon: FileDown,
    hotkey: "Alt+S",
    keys: ["alt+s", "mod+shift+s"],
    category: "File",
  },
  {
    id: "file-export-png",
    label: "Export PNG",
    description: "Export canvas as PNG",
    icon: Download,
    hotkey: "Alt+Shift+S",
    keys: ["alt+shift+s", "mod+alt+s"],
    category: "File",
  },
  // View
  {
    id: "view-zoom-in",
    label: "Zoom in",
    description: "Zoom in 10%",
    icon: ZoomIn,
    hotkey: "Mod+Plus",
    keys: ["mod+plus", "mod+equal", "mod++"],
    category: "View",
  },
  {
    id: "view-zoom-out",
    label: "Zoom out",
    description: "Zoom out 10%",
    icon: ZoomOut,
    hotkey: "Mod+Minus",
    keys: ["mod+minus", "mod+-", "mod+_"],
    category: "View",
  },
  {
    id: "view-zoom-reset",
    label: "Zoom 100%",
    description: "Reset zoom",
    icon: ZoomIn,
    hotkey: "Mod+0",
    keys: ["mod+0"],
    category: "View",
  },
  // Layers — bare "," avoids Mod+, (browser settings on macOS) — Shift not needed
  {
    id: "layer-visibility",
    label: "Toggle visibility",
    description: "Show / hide layer",
    icon: Eye,
    hotkey: ",",
    keys: [",", "comma", "mod+shift+,"],
    category: "Layers",
  },
  // Help
  {
    id: "help-guide",
    label: "Shortcut guide",
    description: "Show all shortcuts",
    icon: HelpCircle,
    hotkey: "?",
    keys: ["?", "shift+/", "f1", "mod+/"],
    category: "Help",
  },
];

export const SHORTCUT_BY_CATEGORY = PHOTOSHOP_SHORTCUTS.reduce(
  (acc, s) => {
    if (!acc[s.category]) {
      acc[s.category] = [];
    }
    acc[s.category].push(s);
    return acc;
  },
  // SAFETY: accumulator starts empty but all categories filled via PHOTOSHOP_SHORTCUTS iteration
  {} as Record<ShortcutCategory, PhotoshopShortcut[]>,
);

export const CATEGORY_ORDER: ShortcutCategory[] = [
  "Tools",
  "Edit",
  "File",
  "View",
  "Layers",
  "Help",
];
