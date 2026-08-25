import { Button, Input } from "@jfa.dev/common/ui";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Autocomplete,
  Dialog,
  DialogTrigger,
  Menu,
  MenuItem,
  Modal,
  ModalOverlay,
  SearchField,
} from "react-aria-components";
import { toast } from "sonner";

import { HotkeyKbd } from "@/app/components/hotkey-kbd";
import { isListAddress, normalizeListAddress } from "@/features/lists/lib/list-id";
import {
  buildListSearchIndex,
  searchListIndex,
  type ListSearchIndex,
} from "@/features/lists/lib/list-search";
import { listLocalLists } from "@/features/lists/lib/local-list-store";

const OPEN_LIST_HOTKEY = "Mod+K";
const SUGGESTION_LIMIT = 6;

export function OpenListCommand() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [savedLists, setSavedLists] = useState<ListSearchIndex | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useHotkey(OPEN_LIST_HOTKEY, () => {
    setIsDialogOpen((isOpen) => !isOpen);
  });

  useEffect(() => {
    if (isDialogOpen) {
      inputRef.current?.focus();
      void listLocalLists().then((lists) => setSavedLists(buildListSearchIndex(lists)));
    }
  }, [isDialogOpen]);

  const suggestions = useMemo(
    () => (savedLists ? searchListIndex(savedLists, value).slice(0, SUGGESTION_LIMIT) : []),
    [savedLists, value],
  );

  const openList = async (listId?: string): Promise<void> => {
    if (listId) {
      await navigate({ to: "/$listId", params: { listId } });
      return;
    }

    const normalizedValue = value.trim().toLowerCase();
    if (!isListAddress(normalizedValue)) {
      toast.error("Please enter a list ID or alias.");
      return;
    }

    await navigate({
      to: "/$listId",
      params: { listId: normalizeListAddress(normalizedValue) },
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();

    const activeDescendant = inputRef.current?.getAttribute("aria-activedescendant");
    const activeSuggestion = suggestions.find(
      (suggestion) => `list-${suggestion.list.id}` === activeDescendant,
    );

    void openList(activeSuggestion?.list.id);
  };

  const reset = (): void => {
    setValue("");
  };

  const normalizedValue = value.trim().toLowerCase();
  const showOpenItem = suggestions.length === 0 && isListAddress(normalizedValue);

  return (
    <DialogTrigger
      isOpen={isDialogOpen}
      onOpenChange={(isOpen) => {
        setIsDialogOpen(isOpen);
        if (!isOpen) {
          reset();
        }
      }}
    >
      <Button
        aria-label="Open list"
        size="lg"
        variant="ghost"
        className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowUpRight className="size-4" />
        <span>Open list</span>
        <HotkeyKbd className="hidden sm:inline-flex" hotkey={OPEN_LIST_HOTKEY} />
      </Button>
      <ModalOverlay
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-16 sm:pt-20"
        isDismissable
      >
        <Modal className="w-full max-w-lg outline-none">
          <Dialog
            aria-label="Open a list"
            className="overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl outline-none"
          >
            <Autocomplete>
              <SearchField
                aria-label="List ID or alias"
                className="flex items-center gap-3 border-b border-border px-4"
                onChange={(nextValue) => {
                  setValue(nextValue);
                }}
                value={value}
              >
                <Search className="size-5 shrink-0 text-muted-foreground" />
                <Input
                  autoComplete="off"
                  className="h-12 rounded-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 md:text-base"
                  enterKeyHint="go"
                  ref={inputRef}
                  onKeyDown={handleKeyDown}
                  placeholder="Search your lists"
                />
              </SearchField>
              <div className="space-y-1 border-b border-border px-4 py-3 text-sm text-muted-foreground">
                <p>Search your saved lists by alias or title, or enter a shared list ID.</p>
                <p>
                  Example: <span className="font-mono text-xs">groceries-apple</span>
                </p>
              </div>
              <Menu
                aria-label="List actions"
                className="p-2 outline-none"
                renderEmptyState={() => null}
              >
                {suggestions.map(({ list }) => (
                  <MenuItem
                    key={list.id}
                    id={`list-${list.id}`}
                    className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm outline-none data-focused:bg-muted"
                    onAction={() => void openList(list.id)}
                    textValue={list.alias ?? list.title}
                  >
                    <span className="truncate">{list.alias ?? list.title}</span>
                    <span className="shrink-0 truncate text-xs text-muted-foreground">
                      {list.alias && list.title !== list.alias ? list.title : ""}
                    </span>
                  </MenuItem>
                ))}
                {showOpenItem ? (
                  <MenuItem
                    className="flex items-center justify-between rounded-md px-3 py-2 text-sm outline-none data-focused:bg-muted"
                    id="open-list"
                    onAction={() => void openList()}
                    textValue="Open list"
                  >
                    <span>Open list</span>
                    <span className="text-xs text-muted-foreground">↵</span>
                  </MenuItem>
                ) : null}
              </Menu>
            </Autocomplete>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
