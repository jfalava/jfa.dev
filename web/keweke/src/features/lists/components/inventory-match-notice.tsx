import { TriangleAlert } from "lucide-react";

import { inventoryMatchMessage, type InventoryMatch } from "@/features/lists/lib/inventory-match";

/**
 * Advisory shown under the new-item name input when the draft appears to name
 * something already in inventory. It never blocks input on its own: the add is
 * confirmed separately, so this is a live hint rather than a validation error.
 */
export function InventoryMatchNotice({ id, match }: { id: string; match: InventoryMatch }) {
  if (match.status === "none") {
    return null;
  }

  return (
    <output
      className="mt-1 flex items-start gap-1 font-mono text-[9px] leading-tight tracking-widest text-amber-700 uppercase dark:text-amber-500"
      id={id}
    >
      <TriangleAlert aria-hidden="true" className="mt-px size-3 shrink-0" />
      <span className="min-w-0 truncate normal-case">{inventoryMatchMessage(match)}</span>
    </output>
  );
}
