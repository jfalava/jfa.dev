import type { ListItem } from "@jfa.dev/common/lists";

import type { ItemEditDraft } from "./list-item-types";

export const SPREADSHEET_FIELDS = ["name", "quantity", "unit", "amount", "category"] as const;

export type SpreadsheetField = (typeof SPREADSHEET_FIELDS)[number];
export type SpreadsheetNavigation = "up" | "down" | "left" | "right" | "next" | "previous";
export type SpreadsheetLocation = {
  rowId: string;
  field: SpreadsheetField;
};

export const NEW_SPREADSHEET_ROW_ID = "__new__";

export function itemToEditDraft(item: ListItem): ItemEditDraft {
  return {
    name: item.name,
    quantity: String(item.quantity),
    unit: item.unit,
    amount: item.amount,
    category: item.category,
  };
}

export function areItemDraftsEqual(first: ItemEditDraft, second: ItemEditDraft): boolean {
  return SPREADSHEET_FIELDS.every((field) => first[field] === second[field]);
}

export function isSpreadsheetField(value: string | undefined): value is SpreadsheetField {
  return SPREADSHEET_FIELDS.some((field) => field === value);
}

export function moveSpreadsheetLocation(
  location: SpreadsheetLocation,
  rowIds: readonly string[],
  navigation: SpreadsheetNavigation,
): SpreadsheetLocation {
  const rows = rowIds.length > 0 ? rowIds : [location.rowId];
  const rowIndex = Math.max(0, rows.indexOf(location.rowId));
  const fieldIndex = SPREADSHEET_FIELDS.indexOf(location.field);

  if (navigation === "up" || navigation === "down") {
    const nextRowIndex = navigation === "up" ? rowIndex - 1 : rowIndex + 1;
    return {
      rowId: rows[Math.min(rows.length - 1, Math.max(0, nextRowIndex))] ?? location.rowId,
      field: location.field,
    };
  }

  if (navigation === "left" || navigation === "right") {
    const nextFieldIndex = navigation === "left" ? fieldIndex - 1 : fieldIndex + 1;
    return {
      rowId: rows[rowIndex] ?? location.rowId,
      field:
        SPREADSHEET_FIELDS[Math.min(SPREADSHEET_FIELDS.length - 1, Math.max(0, nextFieldIndex))] ??
        location.field,
    };
  }

  const step = navigation === "next" ? 1 : -1;
  const nextFieldIndex = fieldIndex + step;
  if (nextFieldIndex >= 0 && nextFieldIndex < SPREADSHEET_FIELDS.length) {
    return {
      rowId: rows[rowIndex] ?? location.rowId,
      field: SPREADSHEET_FIELDS[nextFieldIndex] ?? location.field,
    };
  }

  const nextRowIndex = Math.min(rows.length - 1, Math.max(0, rowIndex + step));
  return {
    rowId: rows[nextRowIndex] ?? location.rowId,
    field: step > 0 ? SPREADSHEET_FIELDS[0] : (SPREADSHEET_FIELDS.at(-1) ?? location.field),
  };
}
