import { describe, expect, test } from "bun:test";

import {
  areItemDraftsEqual,
  itemToEditDraft,
  moveSpreadsheetLocation,
  NEW_SPREADSHEET_ROW_ID,
  SPREADSHEET_FIELDS,
  type SpreadsheetLocation,
} from "./spreadsheet-mode";

const ROW_IDS = ["row-1", "row-2", NEW_SPREADSHEET_ROW_ID];

function location(rowId: string, field: SpreadsheetLocation["field"]): SpreadsheetLocation {
  return { rowId, field };
}

describe("spreadsheet navigation", () => {
  test("moves through fields and wraps Tab to the next row", () => {
    expect(moveSpreadsheetLocation(location("row-1", "name"), ROW_IDS, "next")).toEqual(
      location("row-1", "quantity"),
    );
    expect(moveSpreadsheetLocation(location("row-1", "category"), ROW_IDS, "next")).toEqual(
      location("row-2", "name"),
    );
    expect(moveSpreadsheetLocation(location("row-2", "name"), ROW_IDS, "previous")).toEqual(
      location("row-1", "category"),
    );
  });

  test("moves vertically without changing the selected field", () => {
    expect(moveSpreadsheetLocation(location("row-1", "unit"), ROW_IDS, "down")).toEqual(
      location("row-2", "unit"),
    );
    expect(
      moveSpreadsheetLocation(location(NEW_SPREADSHEET_ROW_ID, "amount"), ROW_IDS, "up"),
    ).toEqual(location("row-2", "amount"));
  });

  test("keeps arrow navigation at the edge of the grid", () => {
    expect(
      moveSpreadsheetLocation(location("row-1", SPREADSHEET_FIELDS[0]), ROW_IDS, "left"),
    ).toEqual(location("row-1", "name"));
    expect(
      moveSpreadsheetLocation(
        location(NEW_SPREADSHEET_ROW_ID, SPREADSHEET_FIELDS.at(-1)!),
        ROW_IDS,
        "right",
      ),
    ).toEqual(location(NEW_SPREADSHEET_ROW_ID, "category"));
    expect(moveSpreadsheetLocation(location("row-1", "name"), ROW_IDS, "up")).toEqual(
      location("row-1", "name"),
    );
  });
});

describe("spreadsheet drafts", () => {
  test("converts list items to editable string drafts", () => {
    expect(
      itemToEditDraft({
        id: "item-1",
        name: "Coffee",
        quantity: 2,
        unit: "bag",
        amount: "250g",
        category: "PANTRY",
        checked: false,
        position: 0,
        createdAt: "2026-08-20T00:00:00.000Z",
        updatedAt: "2026-08-20T00:00:00.000Z",
        createdBy: null,
        updatedBy: null,
      }),
    ).toEqual({
      name: "Coffee",
      quantity: "2",
      unit: "bag",
      amount: "250g",
      category: "PANTRY",
    });
  });

  test("compares only editable fields", () => {
    const draft = {
      name: "Coffee",
      quantity: "2",
      unit: "bag",
      amount: "250g",
      category: "PANTRY",
    };
    expect(areItemDraftsEqual(draft, { ...draft })).toBe(true);
    expect(areItemDraftsEqual(draft, { ...draft, amount: "500g" })).toBe(false);
  });
});
