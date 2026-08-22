import type { ListItem } from "@jfa.dev/common/lists";
import { Button, Checkbox, Input, TableCell } from "@jfa.dev/common/ui";
import { useHotkey, useHotkeys } from "@tanstack/react-hotkeys";
import { History, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent } from "react";

import { HotkeyKbd } from "@/app/components/hotkey-kbd";
import {
  hasItemDraftErrors,
  validateItemDraft,
  type ItemDraftErrors,
} from "@/features/lists/lib/item-draft";

import { ItemFieldError } from "./list-item-elements";
import type { ItemEditDraft, NewItemDraft } from "./list-item-types";
import {
  areItemDraftsEqual,
  isSpreadsheetField,
  itemToEditDraft,
  moveSpreadsheetLocation,
  NEW_SPREADSHEET_ROW_ID,
  SPREADSHEET_FIELDS,
  type SpreadsheetField,
  type SpreadsheetLocation,
  type SpreadsheetNavigation,
} from "./spreadsheet-mode";

export function SpreadsheetShoppingTable({
  emptyMessage,
  isActive,
  items,
  newItem,
  newItemErrors,
  onAdd,
  onNewItemChange,
  onRemove,
  onShowHistory,
  onToggle,
  onUpdate,
  onExit,
}: {
  emptyMessage?: string;
  isActive: boolean;
  items: ListItem[];
  newItem: NewItemDraft;
  newItemErrors: ItemDraftErrors;
  onAdd: () => Promise<boolean>;
  onNewItemChange: (field: keyof NewItemDraft, value: string) => void;
  onRemove: (id: string) => void;
  onShowHistory?: (item: ListItem) => void;
  onToggle: (id: string, checked: boolean) => void;
  onUpdate: (itemId: string, draft: ItemEditDraft) => Promise<boolean>;
  onExit: () => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [drafts, setDrafts] = useState<Record<string, ItemEditDraft>>({});
  const [draftErrors, setDraftErrors] = useState<Record<string, ItemDraftErrors>>({});
  const [isAdding, setIsAdding] = useState(false);
  const draftsRef = useRef(drafts);
  const itemsRef = useRef(items);
  const isAddingRef = useRef(false);
  const pendingCommitsRef = useRef(new Map<string, Promise<boolean>>());
  const commitQueueRef = useRef(Promise.resolve());
  const wasActiveRef = useRef(false);
  const onAddRef = useRef(onAdd);

  useEffect(() => {
    draftsRef.current = drafts;
    itemsRef.current = items;
  }, [drafts, items]);

  useEffect(() => {
    onAddRef.current = onAdd;
  }, [onAdd]);

  const rowIds = useMemo(() => [...items.map((item) => item.id), NEW_SPREADSHEET_ROW_ID], [items]);

  const clearDraft = useCallback((itemId: string, draft?: ItemEditDraft): void => {
    setDrafts((current) => {
      const currentDraft = current[itemId];
      if (!currentDraft || (draft && !areItemDraftsEqual(currentDraft, draft))) {
        return current;
      }
      const next = { ...current };
      delete next[itemId];
      return next;
    });
    setDraftErrors((current) => {
      if (!current[itemId]) {
        return current;
      }
      const next = { ...current };
      delete next[itemId];
      return next;
    });
  }, []);

  const enqueueCommit = useCallback(
    (itemId: string, draft: ItemEditDraft): Promise<boolean> => {
      const nextCommit = commitQueueRef.current.then(async () => {
        try {
          return await onUpdate(itemId, draft);
        } catch {
          return false;
        }
      });
      commitQueueRef.current = nextCommit.then(
        () => undefined,
        () => undefined,
      );
      return nextCommit;
    },
    [onUpdate],
  );

  const commitSpreadsheetDraft = useCallback(
    (itemId: string, draft: ItemEditDraft): Promise<boolean> => {
      const pendingCommit = pendingCommitsRef.current.get(itemId);
      if (pendingCommit) {
        return pendingCommit;
      }

      const errors = validateItemDraft(draft);
      if (hasItemDraftErrors(errors)) {
        setDraftErrors((current) => ({ ...current, [itemId]: errors }));
        return Promise.resolve(false);
      }

      const item = itemsRef.current.find((candidate) => candidate.id === itemId);
      if (!item) {
        return Promise.resolve(false);
      }

      if (areItemDraftsEqual(itemToEditDraft(item), draft)) {
        clearDraft(itemId, draft);
        return Promise.resolve(true);
      }

      const nextCommit = enqueueCommit(itemId, draft);
      pendingCommitsRef.current.set(itemId, nextCommit);
      void nextCommit.then((saved) => {
        if (pendingCommitsRef.current.get(itemId) === nextCommit) {
          pendingCommitsRef.current.delete(itemId);
        }
        if (saved) {
          clearDraft(itemId, draft);
        }
        return saved;
      });
      return nextCommit;
    },
    [clearDraft, enqueueCommit],
  );

  const getActiveLocation = useCallback((): SpreadsheetLocation | null => {
    const activeElement = gridRef.current?.ownerDocument.activeElement;
    if (!(activeElement instanceof HTMLInputElement)) {
      return null;
    }

    const rowId = activeElement.dataset.spreadsheetRowId;
    const field = activeElement.dataset.spreadsheetField;
    if (!rowId || !isSpreadsheetField(field)) {
      return null;
    }

    return { rowId, field };
  }, []);

  const focusLocation = useCallback((location: SpreadsheetLocation): void => {
    window.requestAnimationFrame(() => {
      const inputs = gridRef.current?.querySelectorAll<HTMLInputElement>(
        "[data-spreadsheet-input]",
      );
      const input = Array.from(inputs ?? []).find(
        (candidate) =>
          candidate.dataset.spreadsheetRowId === location.rowId &&
          candidate.dataset.spreadsheetField === location.field,
      );
      if (!input) {
        return;
      }
      input.focus();
      input.select();
    });
  }, []);

  const focusLocationRef = useRef(focusLocation);

  useEffect(() => {
    focusLocationRef.current = focusLocation;
  }, [focusLocation]);

  const focusFirstLocation = useCallback((): void => {
    focusLocation({
      rowId: rowIds[0] ?? NEW_SPREADSHEET_ROW_ID,
      field: SPREADSHEET_FIELDS[0],
    });
  }, [focusLocation, rowIds]);

  const navigate = useCallback(
    (navigation: SpreadsheetNavigation): void => {
      const activeLocation = getActiveLocation();
      if (!activeLocation) {
        focusFirstLocation();
        return;
      }
      focusLocation(moveSpreadsheetLocation(activeLocation, rowIds, navigation));
    },
    [focusFirstLocation, focusLocation, getActiveLocation, rowIds],
  );

  const addNewItemAndFocus = useCallback(async (): Promise<void> => {
    if (isAddingRef.current) {
      return;
    }

    isAddingRef.current = true;
    setIsAdding(true);
    try {
      if (await onAddRef.current()) {
        focusLocationRef.current({ rowId: NEW_SPREADSHEET_ROW_ID, field: SPREADSHEET_FIELDS[0] });
      }
    } finally {
      isAddingRef.current = false;
      setIsAdding(false);
    }
  }, []);

  const removeItem = useCallback(
    (itemId: string): void => {
      clearDraft(itemId);
      onRemove(itemId);
    },
    [clearDraft, onRemove],
  );

  const handleEnter = useCallback(
    (shift: boolean): void => {
      const activeLocation = getActiveLocation();
      if (!activeLocation) {
        focusFirstLocation();
        return;
      }
      if (activeLocation.rowId === NEW_SPREADSHEET_ROW_ID) {
        void addNewItemAndFocus();
        return;
      }
      navigate(shift ? "up" : "down");
    },
    [addNewItemAndFocus, focusFirstLocation, getActiveLocation, navigate],
  );

  const deleteCurrentRow = useCallback((): void => {
    const activeLocation = getActiveLocation();
    if (!activeLocation || activeLocation.rowId === NEW_SPREADSHEET_ROW_ID) {
      return;
    }

    const currentRowIndex = rowIds.indexOf(activeLocation.rowId);
    const remainingRowIds = rowIds.filter((rowId) => rowId !== activeLocation.rowId);
    const nextRowId =
      remainingRowIds[Math.min(currentRowIndex, remainingRowIds.length - 1)] ??
      NEW_SPREADSHEET_ROW_ID;
    removeItem(activeLocation.rowId);
    focusLocation({ rowId: nextRowId, field: activeLocation.field });
  }, [focusLocation, getActiveLocation, removeItem, rowIds]);

  const exitSpreadsheetMode = useCallback(async (): Promise<void> => {
    const activeLocation = getActiveLocation();
    if (activeLocation && activeLocation.rowId !== NEW_SPREADSHEET_ROW_ID) {
      const draft = draftsRef.current[activeLocation.rowId];
      if (draft && !(await commitSpreadsheetDraft(activeLocation.rowId, draft))) {
        return;
      }
    }
    const activeElement = gridRef.current?.ownerDocument.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
    onExit();
  }, [commitSpreadsheetDraft, getActiveLocation, onExit]);

  const handleRowBlur = useCallback(
    (event: FocusEvent<HTMLTableRowElement>, itemId: string): void => {
      if (
        event.relatedTarget instanceof HTMLElement &&
        event.currentTarget.contains(event.relatedTarget)
      ) {
        return;
      }
      const draft = draftsRef.current[itemId];
      if (draft) {
        void commitSpreadsheetDraft(itemId, draft);
      }
    },
    [commitSpreadsheetDraft],
  );

  const updateItemDraft = useCallback(
    (itemId: string, field: SpreadsheetField, value: string): void => {
      const item = itemsRef.current.find((candidate) => candidate.id === itemId);
      if (!item) {
        return;
      }
      setDrafts((current) => {
        const currentDraft = current[itemId] ?? itemToEditDraft(item);
        return { ...current, [itemId]: { ...currentDraft, [field]: value } };
      });
      setDraftErrors((current) => {
        const rowErrors = current[itemId];
        if (!rowErrors?.[field]) {
          return current;
        }
        const nextRowErrors = { ...rowErrors };
        delete nextRowErrors[field];
        if (Object.keys(nextRowErrors).length === 0) {
          const next = { ...current };
          delete next[itemId];
          return next;
        }
        return { ...current, [itemId]: nextRowErrors };
      });
    },
    [],
  );

  const handleModeKey = useCallback(
    (navigation: SpreadsheetNavigation): void => {
      if (navigation === "next" && getActiveLocation()?.rowId === NEW_SPREADSHEET_ROW_ID) {
        const activeLocation = getActiveLocation();
        if (activeLocation?.field === SPREADSHEET_FIELDS.at(-1)) {
          void addNewItemAndFocus();
          return;
        }
      }
      navigate(navigation);
    },
    [addNewItemAndFocus, getActiveLocation, navigate],
  );

  useHotkeys(
    [
      { hotkey: "ArrowUp", callback: () => navigate("up") },
      { hotkey: "ArrowDown", callback: () => navigate("down") },
      { hotkey: "ArrowLeft", callback: () => navigate("left") },
      { hotkey: "ArrowRight", callback: () => navigate("right") },
      { hotkey: "Tab", callback: () => handleModeKey("next") },
      { hotkey: "Shift+Tab", callback: () => handleModeKey("previous") },
      { hotkey: "Enter", callback: () => handleEnter(false) },
      { hotkey: "Shift+Enter", callback: () => handleEnter(true) },
      { hotkey: "Mod+Backspace", callback: deleteCurrentRow },
      { hotkey: "Mod+Delete", callback: deleteCurrentRow },
    ],
    {
      enabled: isActive,
      ignoreInputs: false,
      target: gridRef,
    },
  );

  useHotkey("Escape", () => void exitSpreadsheetMode(), {
    enabled: isActive,
    ignoreInputs: false,
  });

  useEffect(() => {
    if (isActive && !wasActiveRef.current) {
      focusFirstLocation();
    }
    wasActiveRef.current = isActive;
  }, [focusFirstLocation, isActive]);

  return (
    <div aria-hidden={!isActive} className={isActive ? "w-full" : "hidden"} ref={gridRef}>
      <div className="invoice-rule flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b bg-primary/5 px-4 py-2 sm:px-6 lg:px-8">
        <p className="font-mono text-[10px] tracking-[0.1em] text-primary uppercase">
          spreadsheet mode · edits save when you leave a row
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] tracking-[0.06em] text-muted-foreground uppercase">
          <span>
            <HotkeyKbd hotkey="Tab" /> next
          </span>
          <span>↑↓ rows</span>
          <span>↵ down</span>
          <span>
            <HotkeyKbd hotkey="Mod+Backspace" /> delete row
          </span>
          <span>
            <HotkeyKbd hotkey="Escape" /> exit
          </span>
        </p>
      </div>
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-210 border-collapse">
          <caption className="sr-only">Spreadsheet editor for shopping list items</caption>
          <colgroup>
            <col className="w-16" />
            <col className="w-12" />
            <col className="min-w-52" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-36" />
            <col className="w-36" />
            <col className="w-24" />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="invoice-rule border-b-2">
              {["no.", "done", "item", "qty", "unit", "amount each", "category", "actions"].map(
                (heading) => (
                  <th
                    className="h-10 bg-muted/50 px-3 text-left align-middle font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase first:pl-4"
                    key={heading}
                    scope="col"
                  >
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, index) => (
                <SpreadsheetItemRow
                  draft={drafts[item.id] ?? itemToEditDraft(item)}
                  errors={draftErrors[item.id]}
                  index={index}
                  item={item}
                  key={item.id}
                  onBlur={(event) => handleRowBlur(event, item.id)}
                  onChange={(field, value) => updateItemDraft(item.id, field, value)}
                  onRemove={removeItem}
                  onShowHistory={onShowHistory}
                  onToggle={onToggle}
                />
              ))
            ) : emptyMessage ? (
              <tr>
                <TableCell
                  className="px-4 py-8 text-center font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase"
                  colSpan={8}
                >
                  {emptyMessage}
                </TableCell>
              </tr>
            ) : null}
            <SpreadsheetNewItemRow
              errors={newItemErrors}
              isAdding={isAdding}
              newItem={newItem}
              onAdd={() => void addNewItemAndFocus()}
              onChange={onNewItemChange}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SpreadsheetItemRow({
  draft,
  errors,
  index,
  item,
  onBlur,
  onChange,
  onRemove,
  onShowHistory,
  onToggle,
}: {
  draft: ItemEditDraft;
  errors?: ItemDraftErrors;
  index: number;
  item: ListItem;
  onBlur: (event: FocusEvent<HTMLTableRowElement>) => void;
  onChange: (field: SpreadsheetField, value: string) => void;
  onRemove: (id: string) => void;
  onShowHistory?: (item: ListItem) => void;
  onToggle: (id: string, checked: boolean) => void;
}) {
  return (
    <tr
      className="group border-b border-border/80 transition-colors hover:bg-muted/40"
      onBlur={onBlur}
    >
      <TableCell className="px-4 py-2">
        <span className="font-mono text-[11px] text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </span>
      </TableCell>
      <TableCell className="px-3 py-2">
        <Checkbox
          aria-label={`Mark ${item.name} as ${item.checked ? "open" : "done"}`}
          isSelected={item.checked}
          onChange={(checked) => onToggle(item.id, checked)}
        />
      </TableCell>
      <TableCell className="px-2 py-2 align-top">
        <SpreadsheetInput
          error={errors?.name}
          field="name"
          inputClassName="min-w-44 font-serif"
          label={`Edit ${item.name} name`}
          rowId={item.id}
          value={draft.name}
          onChange={onChange}
        />
      </TableCell>
      <TableCell className="px-2 py-2 align-top">
        <SpreadsheetInput
          error={errors?.quantity}
          field="quantity"
          inputClassName="w-16 text-right font-mono"
          inputMode="numeric"
          label={`Edit ${item.name} quantity`}
          maxLength={6}
          rowId={item.id}
          value={draft.quantity}
          onChange={onChange}
        />
      </TableCell>
      <TableCell className="px-2 py-2 align-top">
        <SpreadsheetInput
          error={errors?.unit}
          field="unit"
          inputClassName="w-20 font-serif text-[11px]"
          label={`Edit ${item.name} unit`}
          maxLength={32}
          rowId={item.id}
          value={draft.unit}
          onChange={onChange}
        />
      </TableCell>
      <TableCell className="px-2 py-2 align-top">
        <SpreadsheetInput
          error={errors?.amount}
          field="amount"
          inputClassName="w-32 font-serif text-[11px]"
          label={`Edit ${item.name} amount each`}
          maxLength={64}
          rowId={item.id}
          value={draft.amount}
          onChange={onChange}
        />
      </TableCell>
      <TableCell className="px-2 py-2 align-top">
        <SpreadsheetInput
          error={errors?.category}
          field="category"
          inputClassName="w-32 font-serif text-[10px]"
          label={`Edit ${item.name} category`}
          maxLength={64}
          rowId={item.id}
          value={draft.category}
          onChange={onChange}
        />
      </TableCell>
      <TableCell className="px-2 py-2 align-top">
        <div className="flex items-center gap-1">
          {onShowHistory ? (
            <Button
              aria-label={`Show history for ${item.name}`}
              className="size-7 px-0"
              onPress={() => onShowHistory(item)}
              variant="ghost"
            >
              <History className="size-3.5" />
            </Button>
          ) : null}
          <Button
            aria-label={`Remove ${item.name}`}
            className="size-7 px-0"
            onPress={() => onRemove(item.id)}
            variant="ghost"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </TableCell>
    </tr>
  );
}

function SpreadsheetNewItemRow({
  errors,
  isAdding,
  newItem,
  onAdd,
  onChange,
}: {
  errors: ItemDraftErrors;
  isAdding: boolean;
  newItem: NewItemDraft;
  onAdd: () => void;
  onChange: (field: keyof NewItemDraft, value: string) => void;
}) {
  return (
    <tr className="border-b-2 border-primary/20 bg-primary/5 align-top">
      <TableCell className="px-4 py-3">
        <span className="font-mono text-[11px] font-semibold text-primary">+</span>
      </TableCell>
      <TableCell className="px-3 py-3">
        <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
          new
        </span>
      </TableCell>
      <TableCell className="px-2 py-3">
        <SpreadsheetInput
          error={errors.name}
          field="name"
          inputClassName="min-w-44 font-serif"
          label="New item name"
          rowId={NEW_SPREADSHEET_ROW_ID}
          value={newItem.name}
          onChange={onChange}
        />
      </TableCell>
      <TableCell className="px-2 py-3">
        <SpreadsheetInput
          error={errors.quantity}
          field="quantity"
          inputClassName="w-16 text-right font-mono"
          inputMode="numeric"
          label="New item quantity"
          maxLength={6}
          rowId={NEW_SPREADSHEET_ROW_ID}
          value={newItem.quantity}
          onChange={onChange}
        />
      </TableCell>
      <TableCell className="px-2 py-3">
        <SpreadsheetInput
          error={errors.unit}
          field="unit"
          inputClassName="w-20 font-serif text-[11px]"
          label="New item unit"
          maxLength={32}
          rowId={NEW_SPREADSHEET_ROW_ID}
          value={newItem.unit}
          onChange={onChange}
        />
      </TableCell>
      <TableCell className="px-2 py-3">
        <SpreadsheetInput
          error={errors.amount}
          field="amount"
          inputClassName="w-32 font-serif text-[11px]"
          label="New item amount each"
          maxLength={64}
          rowId={NEW_SPREADSHEET_ROW_ID}
          value={newItem.amount}
          onChange={onChange}
        />
      </TableCell>
      <TableCell className="px-2 py-3">
        <SpreadsheetInput
          error={errors.category}
          field="category"
          inputClassName="w-32 font-serif text-[10px]"
          label="New item category"
          maxLength={64}
          rowId={NEW_SPREADSHEET_ROW_ID}
          value={newItem.category}
          onChange={onChange}
        />
      </TableCell>
      <TableCell className="px-2 py-3">
        <Button aria-label="Add item" isDisabled={isAdding} onPress={onAdd} size="icon-sm">
          +
        </Button>
      </TableCell>
    </tr>
  );
}

function SpreadsheetInput({
  error,
  field,
  inputClassName,
  inputMode,
  label,
  maxLength,
  rowId,
  value,
  onChange,
}: {
  error?: string;
  field: SpreadsheetField;
  inputClassName: string;
  inputMode?: "numeric";
  label: string;
  maxLength?: number;
  rowId: string;
  value: string;
  onChange: (field: SpreadsheetField, value: string) => void;
}) {
  const errorId = error ? `spreadsheet-${rowId}-${field}-error` : undefined;
  return (
    <>
      <Input
        aria-describedby={errorId}
        aria-invalid={error ? true : undefined}
        aria-label={label}
        className={inputClassName}
        data-spreadsheet-field={field}
        data-spreadsheet-input="true"
        data-spreadsheet-row-id={rowId}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={(event) => onChange(field, event.target.value)}
        value={value}
      />
      {error ? <ItemFieldError id={errorId} message={error} /> : null}
    </>
  );
}
