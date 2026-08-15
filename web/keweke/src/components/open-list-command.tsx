import { Button, Input } from "@jfa.dev/common/ui";
import { useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Search } from "lucide-react";
import { useState } from "react";
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

import { isListAddress, normalizeListAddress } from "@/lib/list-id";

export function OpenListCommand() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();

  const openList = async (): Promise<void> => {
    const normalizedValue = value.trim().toLowerCase();
    if (!isListAddress(normalizedValue)) {
      setError("Please enter a list ID or alias.");
      return;
    }

    await navigate({
      to: "/$listId",
      params: { listId: normalizeListAddress(normalizedValue) },
    });
  };

  const reset = (): void => {
    setValue("");
    setError(undefined);
  };

  return (
    <DialogTrigger
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          reset();
        }
      }}
    >
      <Button aria-label="Open list" className="h-7" variant="outline">
        <ArrowUpRight className="size-3.5" />
        <span>Open list</span>
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
                  setError(undefined);
                }}
                value={value}
              >
                <Search className="size-5 shrink-0 text-muted-foreground" />
                <Input
                  autoComplete="off"
                  className="h-12 rounded-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 md:text-base"
                  enterKeyHint="go"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void openList();
                    }
                  }}
                  placeholder="Enter a list ID or alias"
                />
              </SearchField>
              <div className="space-y-1 border-b border-border px-4 py-3 text-sm text-muted-foreground">
                <p>Enter the list ID or alias someone shared with you.</p>
                <p>
                  Example: <span className="font-mono text-xs">groceries-apple</span>
                </p>
              </div>
              {error ? (
                <p className="border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Menu
                aria-label="List actions"
                className="p-2 outline-none"
                renderEmptyState={() => null}
              >
                <MenuItem
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm outline-none data-[focused]:bg-muted"
                  id="open-list"
                  onAction={() => void openList()}
                  textValue="Open list"
                >
                  <span>Open list</span>
                  <span className="text-xs text-muted-foreground">↵</span>
                </MenuItem>
              </Menu>
            </Autocomplete>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
