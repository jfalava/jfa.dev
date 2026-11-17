import { Button, Input } from "@jfa.dev/common/ui";
import { useHotkey } from "@tanstack/react-hotkeys";
import { fbs } from "fbtee";
import { FileSpreadsheet, Info, RefreshCw, Search } from "lucide-react";

import { HotkeyKbd } from "@/app/components/hotkey-kbd";

import type { ListView } from "../lib/list-view";

import { ListAlias, ListTitleEditor } from "./list-header-controls";
import { ListViewTabs } from "./list-view-tabs";

export const SPREADSHEET_MODE_HOTKEY = "Mod+Shift+E";
export const FOCUS_SEARCH_HOTKEY = "F";
export const FOCUS_NEW_ITEM_HOTKEY = "N";

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
  view: ListView;
  onFilterChange: (value: string) => void;
  onOpenHelp: () => void;
  onRefresh: () => void;
  onRename: (title: string) => Promise<boolean>;
  onSpreadsheetModeChange: (isActive: boolean) => void;
  onViewChange: (view: ListView) => void;
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
  view,
  onFilterChange,
  onOpenHelp,
  onRefresh,
  onRename,
  onSpreadsheetModeChange,
  onViewChange,
  title,
}: ListPageHeaderProps) {
  useHotkey(SPREADSHEET_MODE_HOTKEY, () => onSpreadsheetModeChange(!isSpreadsheetMode), {
    enabled: isDesktop,
  });

  return (
    <>
      <div className="flex flex-col gap-5 border-b page-gutters py-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <ListTitleEditor isSaving={isRenaming} onSave={onRename} title={title} />
          <ListAlias key={`${listId}:${alias ?? ""}`} alias={alias} listId={listId} />
        </div>
        <p className="text-sm text-muted-foreground">
          {backend === "local" ? (
            <fbt desc="List page header: summary of a list stored only in this browser, with its open and done item counts">
              Local ·{" "}
              <fbt:plural count={activeCount} many="open" name="openCount" showCount="yes">
                open
              </fbt:plural>{" "}
              ·{" "}
              <fbt:plural count={completedCount} many="done" name="completedCount" showCount="yes">
                done
              </fbt:plural>
            </fbt>
          ) : (
            <fbt desc="List page header: summary of a list stored on the server, with its open and done item counts">
              Remote ·{" "}
              <fbt:plural count={activeCount} many="open" name="openCount" showCount="yes">
                open
              </fbt:plural>{" "}
              ·{" "}
              <fbt:plural count={completedCount} many="done" name="completedCount" showCount="yes">
                done
              </fbt:plural>
            </fbt>
          )}
        </p>
      </div>

      <ListViewTabs onChange={onViewChange} view={view} />

      <div className="border-b page-gutters py-3">
        <div className="flex items-center justify-between gap-1.5">
          <div className="relative min-w-0 flex-1 lg:max-w-5xl">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="filter-items"
              aria-label={fbs(
                "Search items",
                "Accessible label of the item search field on a list page",
              )}
              className="h-8 w-full max-w-none pr-10 pl-10 font-serif"
              onChange={(event) => onFilterChange(event.target.value)}
              placeholder={fbs(
                "Search items",
                "Placeholder of the item search field on a list page",
              )}
              value={filter}
            />
            <span className="group/button pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 sm:inline-flex">
              <HotkeyKbd hotkey={FOCUS_SEARCH_HOTKEY} />
            </span>
          </div>
          {isLiveDropped ? (
            <Button
              aria-label={fbs(
                "Reconnect live updates",
                "Accessible label of the button that reconnects a list's dropped live updates",
              )}
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
            aria-label={
              isSpreadsheetMode
                ? fbs(
                    "Exit spreadsheet mode",
                    "Accessible label of the button that leaves the spreadsheet editing mode",
                  )
                : fbs(
                    "Enter spreadsheet mode",
                    "Accessible label of the button that opens the spreadsheet editing mode",
                  )
            }
            aria-pressed={isSpreadsheetMode}
            className="hidden shrink-0 md:inline-flex"
            onPress={() => onSpreadsheetModeChange(!isSpreadsheetMode)}
            size="lg"
            variant={isSpreadsheetMode ? "default" : "ghost"}
          >
            <FileSpreadsheet aria-hidden="true" />
            <span className="hidden sm:inline">
              {isSpreadsheetMode ? (
                <fbt desc="Button that leaves the spreadsheet editing mode">Exit spreadsheet</fbt>
              ) : (
                <fbt desc="Button that opens the spreadsheet editing mode">Spreadsheet</fbt>
              )}
            </span>
            <HotkeyKbd className="hidden sm:inline-flex" hotkey={SPREADSHEET_MODE_HOTKEY} />
          </Button>
          <Button
            aria-label={fbs(
              "How to add items",
              "Accessible label of the list page button that opens the how-to-add-items help",
            )}
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
