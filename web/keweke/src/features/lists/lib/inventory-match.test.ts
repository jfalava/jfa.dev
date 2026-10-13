import { describe, expect, test } from "bun:test";

import type { ListItem } from "@jfa.dev/common/lists";

import {
  buildInventoryIndex,
  inventoryMatchMessage,
  matchInventoryName,
  type InventoryMatchReason,
} from "./inventory-match";

const NOW = "2026-08-17T00:00:00.000Z";

let fixtureCounter = 0;

function inventoryItem(name: string, overrides: Partial<ListItem> = {}): ListItem {
  fixtureCounter += 1;
  return {
    id: `01900000-0000-7000-8000-${fixtureCounter.toString().padStart(12, "0")}`,
    name,
    quantity: 1,
    unit: "EA",
    amount: "",
    category: "GENERAL",
    inventoryQuantity: 1,
    checked: true,
    position: 0,
    createdAt: NOW,
    updatedAt: NOW,
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

function openItem(name: string): ListItem {
  return inventoryItem(name, { checked: false, inventoryQuantity: null });
}

function matchFor(name: string, items: readonly ListItem[]) {
  return matchInventoryName(name, buildInventoryIndex(items));
}

function reasonFor(name: string, items: readonly ListItem[]): InventoryMatchReason | undefined {
  return matchFor(name, items).reason;
}

describe("matchInventoryName", () => {
  test("matches an identical name as exact", () => {
    expect(reasonFor("Milk", [inventoryItem("milk")])).toBe("exact");
  });

  test("matches across case and accents", () => {
    expect(reasonFor("Crème Fraîche", [inventoryItem("creme fraiche")])).toBe("exact");
  });

  test("matches a plural against its singular", () => {
    expect(reasonFor("Tomatoes", [inventoryItem("tomato")])).toBe("plural");
    expect(reasonFor("Loaves", [inventoryItem("loaf")])).toBe("plural");
    expect(reasonFor("Berries", [inventoryItem("berry")])).toBe("plural");
  });

  test("matches a name contained in a qualified inventory entry", () => {
    expect(reasonFor("Milk", [inventoryItem("whole milk 2%")])).toBe("contained");
    expect(reasonFor("Bread", [inventoryItem("sliced bread")])).toBe("contained");
    expect(reasonFor("bread", [inventoryItem("bag of bread")])).toBe("contained");
  });

  test("tolerates a qualifier the draft adds but the entry omits", () => {
    expect(reasonFor("bag of bread", [inventoryItem("sliced bread")])).toBe("contained");
    expect(reasonFor("box of oat", [inventoryItem("oats")])).toBe("contained");
  });

  test("treats a swapped pair of letters as one mistake", () => {
    expect(reasonFor("riec", [inventoryItem("rice")])).toBe("fuzzy");
    expect(reasonFor("cheddra", [inventoryItem("cheddar")])).toBe("fuzzy");
  });

  test("matches a typo within a long enough token", () => {
    expect(reasonFor("Coffe", [inventoryItem("coffee")])).toBe("fuzzy");
    expect(reasonFor("Bananna", [inventoryItem("banana")])).toBe("fuzzy");
    expect(reasonFor("Papriika", [inventoryItem("paprika")])).toBe("fuzzy");
  });

  test("reports a typo that also folds to a singular as plural", () => {
    expect(reasonFor("Tomatos", [inventoryItem("tomatoes")])).toBe("plural");
  });

  test("rejects a different product that shares a word", () => {
    for (const name of ["Milk", "milk"]) {
      expect(matchFor(name, [inventoryItem("milk chocolate")])).toEqual({
        status: "none",
      });
      expect(matchFor(name, [inventoryItem("chicken breast")])).toEqual({
        status: "none",
      });
    }
  });

  test("rejects short tokens that would only fuzzy-match by accident", () => {
    expect(matchFor("ale", [inventoryItem("apple")])).toEqual({ status: "none" });
  });

  test("rejects unrelated products", () => {
    expect(matchFor("Soap", [inventoryItem("Tomatoes")])).toEqual({ status: "none" });
  });

  test("ignores items that are not in inventory", () => {
    expect(matchFor("Milk", [openItem("milk")])).toEqual({ status: "none" });
  });

  test("returns no match for an empty name", () => {
    for (const name of ["", "   ", "!!!"]) {
      expect(matchFor(name, [inventoryItem("milk")])).toEqual({ status: "none" });
    }
  });

  test("returns the matched item", () => {
    const item = inventoryItem("milk", { quantity: 2, unit: "L" });
    expect(matchFor("Milk", [item]).item).toBe(item);
  });

  test("prefers the strongest match", () => {
    const weaker = inventoryItem("milk 2%");
    const stronger = inventoryItem("milk");
    expect(matchFor("Milk", [weaker, stronger]).item).toBe(stronger);
  });

  test("prefers the more specific entry when both match", () => {
    const generic = inventoryItem("milk");
    const specific = inventoryItem("whole milk 2%");
    expect(matchFor("Milk", [generic, specific]).item).toBe(generic);
  });

  test("does not depend on the order of the items", () => {
    const first = inventoryItem("milk");
    const second = inventoryItem("milk", { updatedAt: "2026-08-01T00:00:00.000Z" });
    const third = inventoryItem("milk", { updatedAt: "2026-09-01T00:00:00.000Z" });

    const expected = third.id;
    for (const items of [
      [first, second, third],
      [third, second, first],
      [second, third, first],
    ]) {
      expect(matchFor("Milk", items).item?.id).toBe(expected);
    }
  });

  test("breaks ties toward the more recently updated entry", () => {
    const older = inventoryItem("milk", { updatedAt: "2026-08-01T00:00:00.000Z" });
    const newer = inventoryItem("milk", { updatedAt: "2026-09-01T00:00:00.000Z" });
    expect(matchFor("Milk", [older, newer]).item).toBe(newer);
  });

  test("still matches when a plural and a qualified entry both apply", () => {
    const entries = [inventoryItem("tomatoes"), inventoryItem("tomato paste")];
    expect(matchFor("Tomatoes", entries).item).toBe(entries[0]);
  });
});

describe("inventoryMatchMessage", () => {
  test("names the entry and its measure", () => {
    const item = inventoryItem("whole milk 2%", { quantity: 2, unit: "L" });
    expect(inventoryMatchMessage(matchFor("milk", [item]))).toBe(
      "Already in inventory: whole milk 2% (2 L)",
    );
  });

  test("omits a zero quantity", () => {
    const item = inventoryItem("butter", { quantity: 0, unit: "EA" });
    expect(inventoryMatchMessage(matchFor("butter", [item]))).toBe(
      "Already in inventory: butter (EA)",
    );
  });

  test("is empty without a match", () => {
    expect(inventoryMatchMessage({ status: "none" })).toBe("");
  });
});
