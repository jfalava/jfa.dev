import { Button, Input, TableCell, Toggle } from "@jfa.dev/common/ui";
import { Plus, Save, X } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "react-aria-components";

import type { InventoryMatch } from "@/features/lists/lib/inventory-match";
import type { ItemDraftErrors } from "@/features/lists/lib/item-draft";

import { InventoryMatchNotice } from "./inventory-match-notice";
import {
  ItemFieldError,
  MobileEditQuantityStepper,
  NewQuantityStepper,
} from "./list-item-elements";
import type { ItemEditDraft, NewItemDraft } from "./list-item-types";
import type { ShoppingTableInstance } from "./shopping-columns";

export function MobileShoppingTable({
  emptyMessage,
  editDraft,
  editErrors,
  editingItemId,
  isSaving,
  table,
  onCancelEditing,
  onEditDraftChange,
  onSaveEditing,
}: {
  emptyMessage?: string;
  editDraft?: ItemEditDraft;
  editErrors?: ItemDraftErrors;
  editingItemId?: string;
  isSaving: boolean;
  table: ShoppingTableInstance;
  onCancelEditing: () => void;
  onEditDraftChange: (field: keyof ItemEditDraft, value: string) => void;
  onSaveEditing: () => void;
}) {
  const rows = table.getRowModel().rows;

  return (
    <div className="md:hidden">
      <table className="w-full border-collapse [&_td:first-child]:pl-4 sm:[&_td:first-child]:pl-6 lg:[&_td:first-child]:pl-8 [&_td:last-child]:pr-4 sm:[&_td:last-child]:pr-6 lg:[&_td:last-child]:pr-8 [&_th:first-child]:pl-4 sm:[&_th:first-child]:pl-6 lg:[&_th:first-child]:pl-8 [&_th:last-child]:pr-4 sm:[&_th:last-child]:pr-6 lg:[&_th:last-child]:pr-8">
        <caption className="sr-only">Shopping list items</caption>
        <thead className="sticky top-0 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={`h-8 bg-muted/50 px-2 text-left font-mono text-[10px] tracking-widest text-muted-foreground uppercase first:pl-3 last:pr-3 ${header.column.id === "done" ? "w-12" : header.column.id === "actions" ? "w-32 text-right" : ""}`}
                  scope="col"
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length > 0 ? (
            rows.map((row) => {
              if (editingItemId === row.original.id) {
                return (
                  <tr key={row.id}>
                    <TableCell className="px-4 py-3" colSpan={row.getAllCells().length}>
                      <form
                        className="flex flex-col gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          onSaveEditing();
                        }}
                      >
                        <label
                          className="flex min-w-0 flex-col gap-1"
                          htmlFor={`mobile-edit-name-${row.original.id}`}
                        >
                          <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                            item
                          </span>
                          <Input
                            id={`mobile-edit-name-${row.original.id}`}
                            aria-label={`Edit ${row.original.name} name`}
                            aria-describedby={
                              editErrors?.name
                                ? `mobile-edit-name-error-${row.original.id}`
                                : undefined
                            }
                            aria-invalid={editErrors?.name ? true : undefined}
                            className="h-9 min-w-0 font-serif text-base"
                            maxLength={200}
                            onChange={(event) => onEditDraftChange("name", event.target.value)}
                            value={editDraft?.name ?? row.original.name}
                          />
                          {editErrors?.name ? (
                            <ItemFieldError
                              id={`mobile-edit-name-error-${row.original.id}`}
                              message={editErrors.name}
                            />
                          ) : null}
                        </label>
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                            qty · unit · amount each
                          </span>
                          <div className="flex min-w-0 items-center gap-1">
                            <Input
                              aria-label={`Edit ${row.original.name} quantity`}
                              aria-describedby={
                                editErrors?.quantity
                                  ? `mobile-edit-quantity-error-${row.original.id}`
                                  : undefined
                              }
                              aria-invalid={editErrors?.quantity ? true : undefined}
                              className="h-9 w-16 shrink-0 text-right font-mono text-base"
                              inputMode="numeric"
                              maxLength={6}
                              onChange={(event) =>
                                onEditDraftChange("quantity", event.target.value)
                              }
                              value={editDraft?.quantity ?? String(row.original.quantity)}
                            />
                            <MobileEditQuantityStepper
                              editDraft={editDraft}
                              item={row.original}
                              onAdjust={(nextQuantity) =>
                                onEditDraftChange("quantity", String(nextQuantity))
                              }
                            />
                            <Input
                              aria-label={`Edit ${row.original.name} unit`}
                              aria-describedby={
                                editErrors?.unit
                                  ? `mobile-edit-unit-error-${row.original.id}`
                                  : undefined
                              }
                              aria-invalid={editErrors?.unit ? true : undefined}
                              className="h-9 min-w-0 flex-1 font-serif text-base"
                              maxLength={32}
                              onChange={(event) => onEditDraftChange("unit", event.target.value)}
                              placeholder="Unit"
                              value={editDraft?.unit ?? row.original.unit}
                            />
                            <Input
                              aria-label={`Edit ${row.original.name} amount each`}
                              aria-describedby={
                                editErrors?.amount
                                  ? `mobile-edit-amount-error-${row.original.id}`
                                  : undefined
                              }
                              aria-invalid={editErrors?.amount ? true : undefined}
                              className="h-9 min-w-0 flex-1 font-serif text-base"
                              maxLength={64}
                              onChange={(event) => onEditDraftChange("amount", event.target.value)}
                              placeholder="Each"
                              value={editDraft?.amount ?? row.original.amount}
                            />
                          </div>
                          {editErrors?.quantity || editErrors?.unit || editErrors?.amount ? (
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              {editErrors?.quantity ? (
                                <ItemFieldError
                                  id={`mobile-edit-quantity-error-${row.original.id}`}
                                  message={editErrors.quantity}
                                />
                              ) : null}
                              {editErrors?.unit ? (
                                <ItemFieldError
                                  id={`mobile-edit-unit-error-${row.original.id}`}
                                  message={editErrors.unit}
                                />
                              ) : null}
                              {editErrors?.amount ? (
                                <ItemFieldError
                                  id={`mobile-edit-amount-error-${row.original.id}`}
                                  message={editErrors.amount}
                                />
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        <label
                          className="flex min-w-0 flex-col gap-1"
                          htmlFor={`mobile-edit-category-${row.original.id}`}
                        >
                          <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                            category
                          </span>
                          <Input
                            id={`mobile-edit-category-${row.original.id}`}
                            aria-label={`Edit ${row.original.name} category`}
                            aria-describedby={
                              editErrors?.category
                                ? `mobile-edit-category-error-${row.original.id}`
                                : undefined
                            }
                            aria-invalid={editErrors?.category ? true : undefined}
                            className="h-9 min-w-0 font-serif text-base"
                            maxLength={64}
                            onChange={(event) => onEditDraftChange("category", event.target.value)}
                            value={editDraft?.category ?? row.original.category}
                          />
                          {editErrors?.category ? (
                            <ItemFieldError
                              id={`mobile-edit-category-error-${row.original.id}`}
                              message={editErrors.category}
                            />
                          ) : null}
                        </label>
                        <div className="flex gap-2 pt-1">
                          <Button
                            aria-label={
                              isSaving ? "Saving" : `Save changes to ${row.original.name}`
                            }
                            className="h-11 flex-1"
                            isDisabled={isSaving}
                            type="submit"
                          >
                            <Save />
                          </Button>
                          <Button
                            aria-label={`Cancel editing ${row.original.name}`}
                            className="size-11"
                            isDisabled={isSaving}
                            onPress={onCancelEditing}
                            type="button"
                            variant="ghost"
                          >
                            <X />
                          </Button>
                        </div>
                      </form>
                    </TableCell>
                  </tr>
                );
              }

              return (
                <tr key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell
                      className={
                        cell.column.id === "done"
                          ? "w-12 px-1"
                          : cell.column.id === "actions"
                            ? "w-32 px-1"
                            : "min-w-0 px-1"
                      }
                      key={cell.id}
                    >
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </tr>
              );
            })
          ) : emptyMessage ? (
            <tr>
              <TableCell
                className="px-4 py-8 text-center text-sm text-muted-foreground"
                colSpan={3}
              >
                {emptyMessage}
              </TableCell>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export function MobileNewItemDialog({
  newItem,
  errors,
  inventoryMatch,
  isOpen,
  keepAdding,
  onAdd,
  onChange,
  onKeepAddingChange,
  onOpenChange,
}: {
  newItem: NewItemDraft;
  errors: ItemDraftErrors;
  inventoryMatch: InventoryMatch;
  isOpen: boolean;
  keepAdding: boolean;
  onAdd: () => Promise<boolean>;
  onChange: (field: keyof NewItemDraft, value: string) => void;
  onKeepAddingChange: (keepAdding: boolean) => void;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);

  async function submit(): Promise<void> {
    if (isAdding) {
      return;
    }
    setIsAdding(true);
    try {
      await onAdd();
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <Button
        aria-label="Add item"
        className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 size-14 rounded-full shadow-lg transition-transform active:scale-95 md:hidden"
      >
        <Plus aria-hidden="true" className="size-6" />
      </Button>
      <ModalOverlay
        className="fixed inset-0 z-50 flex h-[var(--visual-viewport-height,100dvh)] items-center justify-center bg-black/40 p-4"
        isDismissable={!isAdding}
        isKeyboardDismissDisabled={isAdding}
      >
        <Modal className="relative flex max-h-full min-h-0 w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-xl outline-none">
          <Dialog aria-label="New item" className="flex min-h-0 flex-auto flex-col outline-none">
            <Button
              aria-label="Close new item"
              className="absolute top-1 right-1 z-10 size-6 rounded-full bg-background p-0 shadow-sm"
              isDisabled={isAdding}
              slot="close"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
            <form
              autoComplete="off"
              className="flex min-h-0 flex-auto flex-col"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <div className="min-h-0 flex-auto overflow-y-auto overscroll-contain p-4">
                <fieldset
                  className="flex min-w-0 flex-col gap-4 disabled:opacity-60"
                  disabled={isAdding}
                >
                  <label className="flex min-w-0 flex-col gap-1" htmlFor="new-item-mobile">
                    <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                      item
                    </span>
                    <Input
                      id="new-item-mobile"
                      aria-label="New item"
                      aria-describedby={errors.name ? "new-item-mobile-name-error" : undefined}
                      aria-invalid={errors.name ? true : undefined}
                      autoComplete="off"
                      className="h-9 font-serif text-base"
                      maxLength={200}
                      name="shopping-item"
                      onChange={(event) => onChange("name", event.target.value)}
                      placeholder="microwave popcorn"
                      value={newItem.name}
                    />
                    {errors.name ? (
                      <ItemFieldError id="new-item-mobile-name-error" message={errors.name} />
                    ) : null}
                    <InventoryMatchNotice
                      id="new-item-mobile-inventory-match"
                      match={inventoryMatch}
                    />
                  </label>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                      qty · unit · amount each
                    </span>
                    <div className="flex min-w-0 items-center gap-1">
                      <Input
                        aria-label="New item quantity"
                        aria-describedby={
                          errors.quantity ? "new-item-mobile-quantity-error" : undefined
                        }
                        aria-invalid={errors.quantity ? true : undefined}
                        className="h-9 w-16 shrink-0 text-right font-mono text-base"
                        inputMode="numeric"
                        maxLength={6}
                        onChange={(event) => onChange("quantity", event.target.value)}
                        value={newItem.quantity}
                      />
                      <span className="[&_button]:size-6">
                        <NewQuantityStepper
                          newItem={newItem}
                          onAdjust={(nextQuantity) => onChange("quantity", String(nextQuantity))}
                        />
                      </span>
                      <Input
                        aria-label="New item unit"
                        aria-describedby={errors.unit ? "new-item-mobile-unit-error" : undefined}
                        aria-invalid={errors.unit ? true : undefined}
                        className="h-9 min-w-0 flex-1 font-serif text-base"
                        maxLength={32}
                        onChange={(event) => onChange("unit", event.target.value)}
                        placeholder="box"
                        value={newItem.unit}
                      />
                      <Input
                        aria-label="New item amount each"
                        aria-describedby={
                          errors.amount ? "new-item-mobile-amount-error" : undefined
                        }
                        aria-invalid={errors.amount ? true : undefined}
                        className="h-9 min-w-0 flex-1 font-serif text-base"
                        maxLength={64}
                        onChange={(event) => onChange("amount", event.target.value)}
                        placeholder="3 bags"
                        value={newItem.amount}
                      />
                    </div>
                    {errors.quantity || errors.unit || errors.amount ? (
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                        {errors.quantity ? (
                          <ItemFieldError
                            id="new-item-mobile-quantity-error"
                            message={errors.quantity}
                          />
                        ) : null}
                        {errors.unit ? (
                          <ItemFieldError id="new-item-mobile-unit-error" message={errors.unit} />
                        ) : null}
                        {errors.amount ? (
                          <ItemFieldError
                            id="new-item-mobile-amount-error"
                            message={errors.amount}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <label className="flex min-w-0 flex-col gap-1" htmlFor="new-category-mobile">
                    <span className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                      category
                    </span>
                    <Input
                      id="new-category-mobile"
                      aria-label="New item category"
                      aria-describedby={
                        errors.category ? "new-item-mobile-category-error" : undefined
                      }
                      aria-invalid={errors.category ? true : undefined}
                      className="h-9 font-serif text-base"
                      maxLength={64}
                      onChange={(event) => onChange("category", event.target.value)}
                      value={newItem.category}
                    />
                    {errors.category ? (
                      <ItemFieldError
                        id="new-item-mobile-category-error"
                        message={errors.category}
                      />
                    ) : null}
                  </label>
                </fieldset>
              </div>
              <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-3">
                <Toggle
                  className="keep-adding-toggle relative h-8 min-w-0 cursor-pointer border-2 bg-muted px-2 text-[11px] text-muted-foreground grayscale active:scale-[0.98] data-[selected]:border-primary/40 data-[selected]:grayscale-0"
                  isDisabled={isAdding}
                  isSelected={keepAdding}
                  onChange={onKeepAddingChange}
                  variant="outline"
                >
                  Keep adding items
                </Toggle>
                <Button
                  className="h-8 gap-1 px-2 text-[11px] active:scale-[0.98]"
                  isDisabled={isAdding}
                  type="submit"
                >
                  <Plus aria-hidden="true" />
                  {isAdding ? "Adding…" : "Add item"}
                </Button>
              </div>
            </form>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
