/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createStarterListSnapshot } from "@jfa.dev/common/lists";

import { itemsForListView, parseListView } from "./list-view";

const LIST_ID = "019c5f7e-7b7b-7000-8000-000000000040";

describe("list views", () => {
  test("separates open items from purchased inventory without changing their order", () => {
    const items = createStarterListSnapshot(LIST_ID).items;

    expect(itemsForListView(items, "list").map((item) => item.name)).toEqual(["Bread", "Tomatoes"]);
    expect(itemsForListView(items, "inventory").map((item) => item.name)).toEqual(["Coffee"]);
  });

  test("falls back to the shopping list for unknown URL values", () => {
    expect(parseListView(undefined)).toBe("list");
    expect(parseListView("unexpected")).toBe("list");
    expect(parseListView("inventory")).toBe("inventory");
  });
});
