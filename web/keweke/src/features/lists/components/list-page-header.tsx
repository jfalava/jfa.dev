import { Button, Input } from "@jfa.dev/common/ui";
import { useHotkey } from "@tanstack/react-hotkeys";
import { FileSpreadsheet, Info, RefreshCw, Search } from "lucide-react";

import { HotkeyKbd } from "@/app/components/hotkey-kbd";

import { ListAlias, ListTitleEditor } from "./list-header-controls";

export const SPREADSHEET_MODE_HOTKEY = "Mod+Shift+E";

export type ListPageHeaderProps = {
  activeCount: number;
  alias: string | null;
  backend: "local" | "remote";
  completedCount: number;
  filter: string;
  isDesktop: boolean;
  isSpreadsheetMode: boolean;
  isLiveDropped: boolean;
  isRefreshing: boolean;
  isRenaming: boolean;
  listId: string;
  onFilterChange: (value: string) => void;
  onOpenHelp: () => void;
  onRefresh: () => void;
  onRename: (title: string) => Promise<boolean>;
  onSpreadsheetModeChange: (isActive: boolean) => void;
  title: string;
};

export function ListPageHeader({
  activeCount,
  alias,
  backend,
  completedCount,
  filter,
  isDesktop,
  isSpreadsheetMode,
  isLiveDropped,
  isRefreshing,
  isRenaming,
  listId,
  onFilterChange,
  onOpenHelp,
  onRefresh,
  onRename,
  onSpreadsheetModeChange,
  title,
}: ListPageHeaderProps) {
  useHotkey(SPREADSHEET_MODE_HOTKEY, () => onSpreadsheetModeChange(!isSpreadsheetMode), {
    enabled: isDesktop,
  });

  return (
    <>
      <div className="invoice-rule flex flex-col gap-5 border-b px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-6 lg:px-8">
        <div>
          <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
            {backend} list
          </p>
          <ListTitleEditor isSaving={isRenaming} onSave={onRename} title={title} />
          <ListAlias key={`${listId}:${alias ?? ""}`} alias={alias} listId={listId} />
        </div>
        <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
          {String(activeCount).padStart(2, "0")} open · {String(completedCount).padStart(2, "0")}{" "}
          done
        </p>
      </div>

      <div className="invoice-rule border-b px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-1.5">
          <div className="relative min-w-0 flex-1 lg:max-w-5xl">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="filter-items"
              aria-label="Search items"
              className="w-full max-w-none pl-10 font-serif text-base sm:text-[11px]"
              onChange={(event) => onFilterChange(event.target.value)}
              placeholder="Search items"
              value={filter}
            />
          </div>
          {isLiveDropped ? (
            <Button
              aria-label="Reconnect live updates"
              className="shrink-0"
              isDisabled={isRefreshing}
              onPress={onRefresh}
              size="icon"
              variant="ghost"
            >
              <RefreshCw aria-hidden="true" className={isRefreshing ? "animate-spin" : undefined} />
            </Button>
          ) : null}
          <Button
            aria-label={isSpreadsheetMode ? "Exit spreadsheet mode" : "Enter spreadsheet mode"}
            aria-pressed={isSpreadsheetMode}
            className="hidden shrink-0 md:inline-flex md:w-auto md:gap-1 md:px-2"
            onPress={() => onSpreadsheetModeChange(!isSpreadsheetMode)}
            size="icon"
            variant={isSpreadsheetMode ? "default" : "ghost"}
          >
            <FileSpreadsheet aria-hidden="true" />
            <span className="hidden sm:inline">
              {isSpreadsheetMode ? "Exit Excel" : "Excel Mode"}
            </span>
            <HotkeyKbd className="hidden sm:inline-flex" hotkey={SPREADSHEET_MODE_HOTKEY} />
          </Button>
          <Button
            aria-label="How to add items"
            className="shrink-0"
            onPress={onOpenHelp}
            size="icon"
            variant="ghost"
          >
            <Info aria-hidden="true" />
          </Button>
        </div>
      </div>
    </>
  );
}
