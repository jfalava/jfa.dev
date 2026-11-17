import { fbs } from "fbtee";

import type { InventoryMatch } from "@/features/lists/lib/inventory-match";
import { inventoryMatchSummary } from "@/features/lists/lib/inventory-match";
import type { ItemDraftProblem } from "@/features/lists/lib/item-draft";

/** Message shown under an item field for a `validateItemDraft` problem code. */
export function itemDraftProblemMessage(problem: ItemDraftProblem): string {
  const labels = {
    "name-required": fbs(
      "Enter a name",
      "Validation error under the item name field when it is empty",
    ),
    "name-too-long": fbs(
      "Name is too long",
      "Validation error under the item name field when it is too long",
    ),
    "quantity-required": fbs(
      "Enter a quantity",
      "Validation error under the item quantity field when it is empty",
    ),
    "quantity-out-of-range": fbs(
      "Enter a number from 1 to 100000",
      "Validation error under the item quantity field when the number is below 1 or above 100000",
    ),
    "quantity-not-whole": fbs(
      "Enter a whole number from 1 to 100000",
      "Validation error under the item quantity field when it is not a whole number",
    ),
    "unit-required": fbs(
      "Enter a unit",
      "Validation error under the item unit field when it is empty",
    ),
    "unit-too-long": fbs(
      "Unit is too long",
      "Validation error under the item unit field when it is too long",
    ),
    "amount-too-long": fbs(
      "Amount is too long",
      "Validation error under the item amount (price or size per unit) field when it is too long",
    ),
    "amount-invalid": fbs(
      "Enter a valid amount",
      "Validation error under the item amount (price or size per unit) field when it is not valid",
    ),
    "category-required": fbs(
      "Enter a category",
      "Validation error under the item category field when it is empty",
    ),
    "category-too-long": fbs(
      "Category is too long",
      "Validation error under the item category field when it is too long",
    ),
  } satisfies Record<ItemDraftProblem, string>;
  return labels[problem];
}

/**
 * Hint naming the inventory entry a new item appears to duplicate, or "" when
 * there is no match.
 */
export function inventoryMatchMessage(match: InventoryMatch): string {
  const summary = inventoryMatchSummary(match);
  if (!summary) {
    return "";
  }

  return fbs(
    `Already in inventory: ${fbs.param("itemName", summary.itemName)} (${fbs.param("itemMeasure", summary.measure)})`,
    "Hint under the new-item name field when an item with a similar name is already in the inventory; itemMeasure is its quantity and unit, such as '2 L'",
  );
}
