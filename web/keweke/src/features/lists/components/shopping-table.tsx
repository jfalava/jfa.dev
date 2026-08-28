import type { ListItem } from "@jfa.dev/common/lists";
import { TableCell } from "@jfa.dev/common/ui";
import { useTable } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import type { LocalIdentity } from "@/features/auth/lib/local-identity";
import {
  hasItemDraftErrors,
  validateItemDraft,
  type ItemDraftErrors,
} from "@/features/lists/lib/item-draft";

import { DesktopNewItemRow } from "./desktop-shopping-table";
import type { ItemEditDraft, NewItemDraft } from "./list-item-types";
import { MobileShoppingTable } from "./mobile-shopping-table";
import {
  createMobileShoppingColumns,
  createShoppingColumns,
  shoppingTableFeatures,
  type ShoppingTableMeta,
} from "./shopping-columns";
import { SpreadsheetShoppingTable } from "./spreadsheet-shopping-table";

export function ShoppingTable({
  emptyMessage,
  identity,
  isSpreadsheetMode,
  items,
  newItem,
  newItemErrors,
  onAdd,
  onAdjustQuantity,
  onNewItemChange,
  onRemove,
  onShowHistory,
  onSpreadsheetModeChange,
  onToggle,
  onUpdate,
}: {
  emptyMessage?: string;
  identity?: LocalIdentity;
  isSpreadsheetMode: boolean;
  items: ListItem[];
  newItem: NewItemDraft;
  newItemErrors: ItemDraftErrors;
  onAdd: () => Promise<boolean>;
  onAdjustQuantity: (itemId: string, nextQuantity: number) => void;
  onNewItemChange: (field: keyof NewItemDraft, value: string) => void;
  onRemove: (id: string) => void;
  onShowHistory?: (item: ListItem) => void;
  onSpreadsheetModeChange: (isActive: boolean) => void;
  onToggle: (id: string, checked: boolean) => void;
  onUpdate: (itemId: string, draft: ItemEditDraft) => Promise<boolean>;
}) {
  const [editingItemId, setEditingItemId] = useState<string>();
  const [editDraft, setEditDraft] = useState<ItemEditDraft>();
  const [isSaving, setIsSaving] = useState(false);
  const [editAttempted, setEditAttempted] = useState(false);
  const [editErrors, setEditErrors] = useState<ItemDraftErrors>({});
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const submitNewItemOnEnter = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter") {
        event.preventDefault();
        void onAdd();
      }
    },
    [onAdd],
  );

  const startEditing = useCallback((item: ListItem): void => {
    setEditingItemId(item.id);
    setEditDraft({
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit,
      amount: item.amount,
      category: item.category,
    });
    setEditAttempted(false);
    setEditErrors({});
  }, []);

  const updateDraft = useCallback((field: keyof ItemEditDraft, value: string): void => {
    setEditDraft((current) => (current ? { ...current, [field]: value } : current));
  }, []);

  const cancelEditing = useCallback((): void => {
    setEditingItemId(undefined);
    setEditDraft(undefined);
    setEditAttempted(false);
    setEditErrors({});
  }, []);

  const displayedEditErrors =
    editAttempted && editDraft ? validateItemDraft(editDraft) : editErrors;

  const saveEditing = useCallback(async (): Promise<void> => {
    if (!editingItemId || !editDraft || isSaving) {
      return;
    }

    const draftErrors = validateItemDraft(editDraft);
    if (hasItemDraftErrors(draftErrors)) {
      setEditAttempted(true);
      setEditErrors(draftErrors);
      return;
    }

    setEditAttempted(false);
    setEditErrors({});
    setIsSaving(true);
    try {
      if (await onUpdateRef.current(editingItemId, editDraft)) {
        setEditingItemId(undefined);
        setEditDraft(undefined);
        setEditAttempted(false);
        setEditErrors({});
      }
    } finally {
      setIsSaving(false);
    }
  }, [editDraft, editingItemId, isSaving]);

  // Keep these cell definitions stable. TanStack renders each cell function as
  // a React component, so recreating them for every draft update remounts the
  // controlled input and drops the browser's focus after one character.
  const columns = useMemo(() => createShoppingColumns(), []);
  const mobileColumns = useMemo(
    () =>
      createMobileShoppingColumns({
        identity,
        isSaving,
        onAdjustQuantity,
        onRemove,
        onShowHistory,
        onStartEditing: startEditing,
        onToggle,
      }),
    [identity, isSaving, onAdjustQuantity, onRemove, onShowHistory, onToggle, startEditing],
  );
  const tableMeta = useMemo<ShoppingTableMeta>(
    () => ({
      editDraft,
      editErrors: displayedEditErrors,
      editingItemId,
      identity,
      isSaving,
      onAdjustQuantity,
      onCancelEditing: cancelEditing,
      onEditDraftChange: updateDraft,
      onRemove,
      onSaveEditing: saveEditing,
      onShowHistory,
      onStartEditing: startEditing,
      onToggle,
    }),
    [
      cancelEditing,
      editDraft,
      displayedEditErrors,
      editingItemId,
      identity,
      isSaving,
      onAdjustQuantity,
      onRemove,
      onShowHistory,
      onToggle,
      saveEditing,
      startEditing,
      updateDraft,
    ],
  );
  const table = useTable({
    features: shoppingTableFeatures,
    data: items,
    columns,
    getRowId: (row) => row.id,
    meta: tableMeta,
  });
  const mobileTable = useTable({
    features: shoppingTableFeatures,
    data: items,
    columns: mobileColumns,
    getRowId: (row) => row.id,
    meta: tableMeta,
  });

  const handleAdd = useCallback((): void => {
    void onAdd();
  }, [onAdd]);

  return (
    <>
      <SpreadsheetShoppingTable
        emptyMessage={emptyMessage}
        isActive={isSpreadsheetMode}
        items={items}
        newItem={newItem}
        newItemErrors={newItemErrors}
        onAdd={onAdd}
        onNewItemChange={onNewItemChange}
        onRemove={onRemove}
        onShowHistory={onShowHistory}
        onToggle={onToggle}
        onUpdate={onUpdate}
        onExit={() => onSpreadsheetModeChange(false)}
      />
      <div className={isSpreadsheetMode ? "hidden" : undefined}>
        <MobileShoppingTable
          editDraft={editDraft}
          editErrors={displayedEditErrors}
          editingItemId={editingItemId}
          isSaving={isSaving}
          newItem={newItem}
          newItemErrors={newItemErrors}
          emptyMessage={emptyMessage}
          table={mobileTable}
          onCancelEditing={cancelEditing}
          onAdd={handleAdd}
          onEditDraftChange={updateDraft}
          onNewItemChange={onNewItemChange}
          onSaveEditing={saveEditing}
          onNewItemKeyDown={submitNewItemOnEnter}
        />
        <div className="hidden w-full overflow-x-auto md:block">
          <table className="w-full min-w-190 border-collapse [&_td:first-child]:pl-4 sm:[&_td:first-child]:pl-6 lg:[&_td:first-child]:pl-8 [&_td:last-child]:pr-4 sm:[&_td:last-child]:pr-6 lg:[&_td:last-child]:pr-8 [&_th:first-child]:pl-4 sm:[&_th:first-child]:pl-6 lg:[&_th:first-child]:pl-8 [&_th:last-child]:pr-4 sm:[&_th:last-child]:pr-6 lg:[&_th:last-child]:pr-8">
            <colgroup>
              <col className="w-24" />
              <col className="w-10" />
              <col />
              <col className="w-24" />
              <col className="w-20" />
              <col className="w-28" />
              <col className="w-32" />
              <col className="w-32" />
              <col className="w-24" />
              <col className="w-12" />
            </colgroup>
            <thead className="sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="invoice-rule border-b-2">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="h-10 bg-muted/50 px-3 text-left align-middle text-[13px] font-semibold tracking-widest text-muted-foreground uppercase first:pl-4"
                    >
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="group border-b border-border/80 transition-colors hover:bg-muted/40"
                  >
                    {row.getAllCells().map((cell) => (
                      <TableCell key={cell.id}>
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </tr>
                ))
              ) : emptyMessage ? (
                <tr>
                  <TableCell
                    className="px-4 py-12 text-center font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase"
                    colSpan={columns.length}
                  >
                    {emptyMessage}
                  </TableCell>
                </tr>
              ) : null}
              <DesktopNewItemRow
                newItem={newItem}
                errors={newItemErrors}
                onAdd={handleAdd}
                onKeyDown={submitNewItemOnEnter}
                onChange={onNewItemChange}
              />
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
