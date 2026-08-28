import { Button, Input, TableCell } from "@jfa.dev/common/ui";
import { Plus } from "lucide-react";
import type { KeyboardEvent } from "react";

import { HotkeyKbd } from "@/app/components/hotkey-kbd";
import type { ItemDraftErrors } from "@/features/lists/lib/item-draft";

import { ItemFieldError, NewQuantityStepper } from "./list-item-elements";
import type { NewItemDraft } from "./list-item-types";

export function DesktopNewItemRow({
  newItem,
  errors,
  onAdd,
  onChange,
  onKeyDown,
}: {
  newItem: NewItemDraft;
  errors: ItemDraftErrors;
  onAdd: () => void;
  onChange: (field: keyof NewItemDraft, value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <tr className="border-b-2 border-primary/20 bg-primary/5 align-top">
      <TableCell className="px-4 py-3">
        <span className="font-mono text-[11px] font-semibold text-primary">+</span>
      </TableCell>
      <TableCell className="px-3 py-3">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
          new <HotkeyKbd hotkey="N" />
        </span>
      </TableCell>
      <TableCell className="px-3 py-3">
        <Input
          id="new-item-desktop"
          aria-label="New item name"
          aria-describedby={errors.name ? "new-item-name-error" : undefined}
          aria-invalid={errors.name ? true : undefined}
          className="h-9 min-w-32 font-serif text-base sm:text-xs"
          maxLength={200}
          onChange={(event) => onChange("name", event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="microwave popcorn"
          value={newItem.name}
        />
        {errors.name ? <ItemFieldError id="new-item-name-error" message={errors.name} /> : null}
      </TableCell>
      <TableCell className="px-3 py-3">
        <span className="flex items-center justify-between gap-0.5">
          <Input
            aria-label="New item quantity"
            aria-describedby={errors.quantity ? "new-item-quantity-error" : undefined}
            aria-invalid={errors.quantity ? true : undefined}
            className="h-9 w-16 text-right font-mono text-base sm:text-xs"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => onChange("quantity", event.target.value)}
            onKeyDown={onKeyDown}
            value={newItem.quantity}
          />
          <NewQuantityStepper newItem={newItem} onAdjust={(q) => onChange("quantity", String(q))} />
        </span>
        {errors.quantity ? (
          <ItemFieldError id="new-item-quantity-error" message={errors.quantity} />
        ) : null}
      </TableCell>
      <TableCell className="px-3 py-3">
        <Input
          aria-label="New item unit"
          aria-describedby={errors.unit ? "new-item-unit-error" : undefined}
          aria-invalid={errors.unit ? true : undefined}
          className="h-9 w-20 font-serif text-base sm:text-xs"
          maxLength={32}
          onChange={(event) => onChange("unit", event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="box"
          value={newItem.unit}
        />
        {errors.unit ? <ItemFieldError id="new-item-unit-error" message={errors.unit} /> : null}
      </TableCell>
      <TableCell className="px-3 py-3">
        <Input
          aria-label="New item amount each"
          aria-describedby={errors.amount ? "new-item-amount-error" : undefined}
          aria-invalid={errors.amount ? true : undefined}
          className="h-9 w-28 font-serif text-base sm:text-xs"
          maxLength={64}
          onChange={(event) => onChange("amount", event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="3 bags"
          value={newItem.amount}
        />
        {errors.amount ? (
          <ItemFieldError id="new-item-amount-error" message={errors.amount} />
        ) : null}
      </TableCell>
      <TableCell className="px-3 py-3">
        <Input
          aria-label="New item category"
          aria-describedby={errors.category ? "new-item-category-error" : undefined}
          aria-invalid={errors.category ? true : undefined}
          className="h-9 w-28 font-serif text-base sm:text-[10px]"
          maxLength={64}
          onChange={(event) => onChange("category", event.target.value)}
          onKeyDown={onKeyDown}
          value={newItem.category}
        />
        {errors.category ? (
          <ItemFieldError id="new-item-category-error" message={errors.category} />
        ) : null}
      </TableCell>
      <TableCell className="px-3 py-3">
        <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
          draft
        </span>
      </TableCell>
      <TableCell className="px-3 py-3">
        <span className="font-mono text-[10px] tracking-[0.08em] text-primary uppercase">open</span>
      </TableCell>
      <TableCell className="px-3 py-3">
        <Button aria-label="Add item" onPress={onAdd} size="icon-sm">
          <Plus />
        </Button>
      </TableCell>
    </tr>
  );
}
