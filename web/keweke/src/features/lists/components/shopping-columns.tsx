import type { ListItem } from "@jfa.dev/common/lists";
import { Button, Checkbox, Input } from "@jfa.dev/common/ui";
import NumberFlow from "@number-flow/react";
import { createColumnHelper, tableFeatures, type ReactTable } from "@tanstack/react-table";
import { Check, History, Pencil, Trash2, X } from "lucide-react";

import type { LocalIdentity } from "@/features/auth/lib/local-identity";
import type { ItemDraftErrors } from "@/features/lists/lib/item-draft";

import {
  ItemFieldError,
  ItemMeasure,
  QuantityStepper,
  SignedItemBadge,
} from "./list-item-elements";
import type { ItemEditDraft } from "./list-item-types";

export type ShoppingTableMeta = {
  editDraft?: ItemEditDraft;
  editErrors?: ItemDraftErrors;
  editingItemId?: string;
  identity?: LocalIdentity;
  isSaving: boolean;
  onAdjustQuantity: (itemId: string, nextQuantity: number) => void;
  onCancelEditing: () => void;
  onEditDraftChange: (field: keyof ItemEditDraft, value: string) => void;
  onRemove: (id: string) => void;
  onSaveEditing: () => void;
  onShowHistory?: (item: ListItem) => void;
  onStartEditing: (item: ListItem) => void;
  onToggle: (id: string, checked: boolean) => void;
};

export const shoppingTableFeatures = tableFeatures({
  // SAFETY: TanStack consumes this metadata through the declared table feature contract.
  tableMeta: {} as ShoppingTableMeta,
});
const shoppingColumnHelper = createColumnHelper<typeof shoppingTableFeatures, ListItem>();

export type ShoppingTableInstance = ReactTable<typeof shoppingTableFeatures, ListItem>;

function getShoppingTableMeta(table: { options: { meta?: ShoppingTableMeta } }): ShoppingTableMeta {
  if (!table.options.meta) {
    throw new Error("Shopping table metadata is missing");
  }
  return table.options.meta;
}

export function createShoppingColumns() {
  return shoppingColumnHelper.columns([
    shoppingColumnHelper.display({
      id: "line",
      header: "no.",
      cell: ({ row }) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {String(row.index + 1).padStart(2, "0")}
        </span>
      ),
    }),
    shoppingColumnHelper.display({
      id: "done",
      header: "",
      cell: ({ row, table }) => {
        const { onToggle } = getShoppingTableMeta(table);
        return (
          <Checkbox
            aria-label={`Mark ${row.original.name} as ${row.original.checked ? "open" : "done"}`}
            isSelected={row.original.checked}
            onChange={(checked) => onToggle(row.original.id, checked)}
          />
        );
      },
    }),
    shoppingColumnHelper.accessor("name", {
      id: "item",
      header: "item",
      cell: ({ getValue, row, table }) => {
        const { editDraft, editErrors, editingItemId, onEditDraftChange } =
          getShoppingTableMeta(table);
        if (editingItemId === row.original.id) {
          return (
            <>
              <Input
                aria-label={`Edit ${row.original.name} name`}
                aria-describedby={
                  editErrors?.name ? `desktop-edit-name-error-${row.original.id}` : undefined
                }
                aria-invalid={editErrors?.name ? true : undefined}
                className="min-w-32 font-serif"
                maxLength={200}
                onChange={(event) => onEditDraftChange("name", event.target.value)}
                value={editDraft?.name ?? getValue()}
              />
              {editErrors?.name ? (
                <ItemFieldError
                  id={`desktop-edit-name-error-${row.original.id}`}
                  message={editErrors.name}
                />
              ) : null}
            </>
          );
        }

        return (
          <span
            className={
              row.original.checked ? "font-serif text-muted-foreground line-through" : "font-serif"
            }
          >
            {getValue()}
          </span>
        );
      },
    }),
    shoppingColumnHelper.accessor("quantity", {
      header: "qty",
      cell: ({ getValue, row, table }) => {
        const { editDraft, editErrors, editingItemId, onAdjustQuantity, onEditDraftChange } =
          getShoppingTableMeta(table);
        if (editingItemId === row.original.id) {
          const draftQuantity = Number(editDraft?.quantity);
          const isDraftQuantityValid =
            Number.isInteger(draftQuantity) && draftQuantity >= 1 && draftQuantity <= 100_000;
          return (
            <>
              <span className="flex items-center justify-between gap-0.5">
                <Input
                  aria-label={`Edit ${row.original.name} quantity`}
                  aria-describedby={
                    editErrors?.quantity
                      ? `desktop-edit-quantity-error-${row.original.id}`
                      : undefined
                  }
                  aria-invalid={editErrors?.quantity ? true : undefined}
                  className="w-16 text-right font-mono"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => onEditDraftChange("quantity", event.target.value)}
                  value={editDraft?.quantity ?? String(getValue())}
                />
                <QuantityStepper
                  isDisabled={!isDraftQuantityValid}
                  itemName={row.original.name}
                  onAdjust={(nextQuantity) => onEditDraftChange("quantity", String(nextQuantity))}
                  quantity={isDraftQuantityValid ? draftQuantity : 1}
                  size="icon-sm"
                />
              </span>
              {editErrors?.quantity ? (
                <ItemFieldError
                  id={`desktop-edit-quantity-error-${row.original.id}`}
                  message={editErrors.quantity}
                />
              ) : null}
            </>
          );
        }

        return (
          <span className="flex items-center justify-between gap-0.5">
            <NumberFlow
              className="font-mono text-[12px]"
              format={{ useGrouping: false }}
              value={getValue()}
            />
            <QuantityStepper
              itemName={row.original.name}
              onAdjust={(nextQuantity) => onAdjustQuantity(row.original.id, nextQuantity)}
              quantity={row.original.quantity}
              size="icon-sm"
            />
          </span>
        );
      },
    }),
    shoppingColumnHelper.accessor("unit", {
      header: "unit",
      cell: ({ getValue, row, table }) => {
        const { editDraft, editErrors, editingItemId, onEditDraftChange } =
          getShoppingTableMeta(table);
        if (editingItemId === row.original.id) {
          return (
            <>
              <Input
                aria-label={`Edit ${row.original.name} unit`}
                aria-describedby={
                  editErrors?.unit ? `desktop-edit-unit-error-${row.original.id}` : undefined
                }
                aria-invalid={editErrors?.unit ? true : undefined}
                className="w-20 font-serif text-[11px]"
                maxLength={32}
                onChange={(event) => onEditDraftChange("unit", event.target.value)}
                value={editDraft?.unit ?? getValue()}
              />
              {editErrors?.unit ? (
                <ItemFieldError
                  id={`desktop-edit-unit-error-${row.original.id}`}
                  message={editErrors.unit}
                />
              ) : null}
            </>
          );
        }

        return <span className="font-serif text-[11px]">{getValue()}</span>;
      },
    }),
    shoppingColumnHelper.accessor("amount", {
      header: "amount each",
      cell: ({ getValue, row, table }) => {
        const { editDraft, editErrors, editingItemId, onEditDraftChange } =
          getShoppingTableMeta(table);
        if (editingItemId === row.original.id) {
          return (
            <>
              <Input
                aria-label={`Edit ${row.original.name} amount each`}
                aria-describedby={
                  editErrors?.amount ? `desktop-edit-amount-error-${row.original.id}` : undefined
                }
                aria-invalid={editErrors?.amount ? true : undefined}
                className="w-28 font-serif text-[11px]"
                maxLength={64}
                onChange={(event) => onEditDraftChange("amount", event.target.value)}
                placeholder="optional"
                value={editDraft?.amount ?? getValue()}
              />
              {editErrors?.amount ? (
                <ItemFieldError
                  id={`desktop-edit-amount-error-${row.original.id}`}
                  message={editErrors.amount}
                />
              ) : null}
            </>
          );
        }

        return <span className="font-serif text-[11px]">{getValue() || "—"}</span>;
      },
    }),
    shoppingColumnHelper.accessor("category", {
      header: "category",
      cell: ({ getValue, row, table }) => {
        const { editDraft, editErrors, editingItemId, onEditDraftChange } =
          getShoppingTableMeta(table);
        if (editingItemId === row.original.id) {
          return (
            <>
              <Input
                aria-label={`Edit ${row.original.name} category`}
                aria-describedby={
                  editErrors?.category
                    ? `desktop-edit-category-error-${row.original.id}`
                    : undefined
                }
                aria-invalid={editErrors?.category ? true : undefined}
                className="w-28 font-serif text-[10px]"
                maxLength={64}
                onChange={(event) => onEditDraftChange("category", event.target.value)}
                value={editDraft?.category ?? getValue()}
              />
              {editErrors?.category ? (
                <ItemFieldError
                  id={`desktop-edit-category-error-${row.original.id}`}
                  message={editErrors.category}
                />
              ) : null}
            </>
          );
        }

        return <span className="font-serif text-[10px] text-muted-foreground">{getValue()}</span>;
      },
    }),
    shoppingColumnHelper.display({
      id: "signed",
      header: "signed",
      cell: ({ row, table }) => {
        const { identity } = getShoppingTableMeta(table);
        return <SignedItemBadge identity={identity} item={row.original} />;
      },
    }),
    shoppingColumnHelper.display({
      id: "status",
      header: "status",
      cell: ({ row }) => (
        <span
          className={
            row.original.checked
              ? "font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase"
              : "font-mono text-[10px] tracking-[0.08em] text-primary uppercase"
          }
        >
          {row.original.checked ? "done" : "open"}
        </span>
      ),
    }),
    shoppingColumnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row, table }) => {
        const {
          editingItemId,
          isSaving,
          onCancelEditing,
          onRemove,
          onSaveEditing,
          onShowHistory,
          onStartEditing,
        } = getShoppingTableMeta(table);
        return editingItemId === row.original.id ? (
          <div className="flex items-center gap-1">
            <Button
              aria-label={`Save changes to ${row.original.name}`}
              isDisabled={isSaving}
              onPress={onSaveEditing}
              size="icon-sm"
            >
              <Check />
            </Button>
            <Button
              aria-label={`Cancel editing ${row.original.name}`}
              isDisabled={isSaving}
              onPress={onCancelEditing}
              size="icon-sm"
              variant="ghost"
            >
              <X />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {onShowHistory ? (
              <Button
                aria-label={`Show history for ${row.original.name}`}
                className="size-7 px-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                onPress={() => onShowHistory(row.original)}
                variant="ghost"
              >
                <History className="size-3.5" />
              </Button>
            ) : null}
            <Button
              aria-label={`Edit ${row.original.name}`}
              className="size-7 px-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              isDisabled={isSaving}
              onPress={() => onStartEditing(row.original)}
              variant="ghost"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              aria-label={`Remove ${row.original.name}`}
              className="size-7 px-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              isDisabled={isSaving}
              onPress={() => onRemove(row.original.id)}
              variant="ghost"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        );
      },
    }),
  ]);
}

export function createMobileShoppingColumns({
  identity,
  isSaving,
  onAdjustQuantity,
  onRemove,
  onShowHistory,
  onStartEditing,
  onToggle,
}: {
  identity?: LocalIdentity;
  isSaving: boolean;
  onAdjustQuantity: (itemId: string, nextQuantity: number) => void;
  onRemove: (id: string) => void;
  onShowHistory?: (item: ListItem) => void;
  onStartEditing: (item: ListItem) => void;
  onToggle: (id: string, checked: boolean) => void;
}) {
  return shoppingColumnHelper.columns([
    shoppingColumnHelper.display({
      id: "done",
      header: "done",
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Mark ${row.original.name} as ${row.original.checked ? "open" : "done"}`}
          className="size-11 shrink-0 justify-center rounded-md"
          isSelected={row.original.checked}
          onChange={(checked) => onToggle(row.original.id, checked)}
        />
      ),
    }),
    shoppingColumnHelper.display({
      id: "item",
      header: "item details",
      cell: ({ row }) => (
        <div className="min-w-0 py-1">
          <p
            className={
              row.original.checked
                ? "truncate font-serif font-medium text-muted-foreground line-through"
                : "truncate font-serif font-medium"
            }
          >
            {row.original.name}
          </p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] tracking-[0.08em] text-muted-foreground">
            <ItemMeasure item={row.original} />
            <span aria-hidden="true" className="font-mono">
              ·
            </span>
            <span className="font-serif">{row.original.category}</span>
            <span aria-hidden="true" className="font-mono">
              ·
            </span>
            <span className="font-mono uppercase">{row.original.checked ? "done" : "open"}</span>
          </div>
          <div className="mt-1">
            <SignedItemBadge identity={identity} item={row.original} />
          </div>
        </div>
      ),
    }),
    shoppingColumnHelper.display({
      id: "actions",
      header: "actions",
      cell: ({ row }) => (
        <div className="flex shrink-0 flex-wrap items-center gap-0.5">
          {onShowHistory ? (
            <Button
              aria-label={`Show history for ${row.original.name}`}
              className="size-11 p-0"
              onPress={() => onShowHistory(row.original)}
              variant="ghost"
            >
              <History className="size-4" />
            </Button>
          ) : null}
          <QuantityStepper
            buttonClassName="size-11 p-0"
            itemName={row.original.name}
            onAdjust={(nextQuantity) => onAdjustQuantity(row.original.id, nextQuantity)}
            quantity={row.original.quantity}
            size="icon"
          />
          <Button
            aria-label={`Edit ${row.original.name}`}
            className="size-11 p-0"
            isDisabled={isSaving}
            onPress={() => onStartEditing(row.original)}
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            aria-label={`Remove ${row.original.name}`}
            className="size-11 p-0"
            isDisabled={isSaving}
            onPress={() => onRemove(row.original.id)}
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    }),
  ]);
}
