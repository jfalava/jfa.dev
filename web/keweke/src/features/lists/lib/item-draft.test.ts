import { describe, expect, test } from "bun:test";

import { hasItemDraftErrors, validateItemDraft, type ItemDraft } from "./item-draft";

const VALID_DRAFT: ItemDraft = {
  name: "Microwave popcorn",
  quantity: "2",
  unit: "box",
  amount: "3 bags",
  category: "SNACKS",
};

describe("validateItemDraft", () => {
  test("accepts a complete draft", () => {
    expect(validateItemDraft(VALID_DRAFT)).toEqual({});
    expect(hasItemDraftErrors(validateItemDraft(VALID_DRAFT))).toBe(false);
  });

  test("rejects a missing, blank, or whitespace-only name", () => {
    for (const name of ["", "   "]) {
      expect(validateItemDraft({ ...VALID_DRAFT, name })).toEqual({ name: "name-required" });
    }
  });

  test("rejects an over-long name", () => {
    expect(validateItemDraft({ ...VALID_DRAFT, name: "x".repeat(201) })).toEqual({
      name: "name-too-long",
    });
  });

  test("rejects missing and non-whole quantities", () => {
    expect(validateItemDraft({ ...VALID_DRAFT, quantity: "" })).toEqual({
      quantity: "quantity-required",
    });
    expect(validateItemDraft({ ...VALID_DRAFT, quantity: "   " })).toEqual({
      quantity: "quantity-required",
    });
    expect(validateItemDraft({ ...VALID_DRAFT, quantity: "1.5" })).toEqual({
      quantity: "quantity-not-whole",
    });
    expect(validateItemDraft({ ...VALID_DRAFT, quantity: "many" })).toEqual({
      quantity: "quantity-not-whole",
    });
  });

  test("rejects quantities outside the 1..100000 range", () => {
    expect(validateItemDraft({ ...VALID_DRAFT, quantity: "0" })).toEqual({
      quantity: "quantity-out-of-range",
    });
    expect(validateItemDraft({ ...VALID_DRAFT, quantity: "100001" })).toEqual({
      quantity: "quantity-out-of-range",
    });
    expect(validateItemDraft({ ...VALID_DRAFT, quantity: "100000" })).toEqual({});
  });

  test("accepts zero quantity for an inventory item", () => {
    expect(
      validateItemDraft({ ...VALID_DRAFT, quantity: "0" }, { allowZeroQuantity: true }),
    ).toEqual({});
  });

  test("rejects a missing or whitespace-only unit", () => {
    for (const unit of ["", "   "]) {
      expect(validateItemDraft({ ...VALID_DRAFT, unit })).toEqual({ unit: "unit-required" });
    }
  });

  test("rejects an over-long unit", () => {
    expect(validateItemDraft({ ...VALID_DRAFT, unit: "u".repeat(33) })).toEqual({
      unit: "unit-too-long",
    });
  });

  test("accepts an empty amount but rejects an over-long one", () => {
    expect(validateItemDraft({ ...VALID_DRAFT, amount: "" })).toEqual({});
    expect(validateItemDraft({ ...VALID_DRAFT, amount: "a".repeat(65) })).toEqual({
      amount: "amount-too-long",
    });
  });

  test("rejects a missing or whitespace-only category", () => {
    for (const category of ["", "   "]) {
      expect(validateItemDraft({ ...VALID_DRAFT, category })).toEqual({
        category: "category-required",
      });
    }
  });

  test("rejects an over-long category", () => {
    expect(validateItemDraft({ ...VALID_DRAFT, category: "c".repeat(65) })).toEqual({
      category: "category-too-long",
    });
  });

  test("reports every rejected field at once", () => {
    expect(
      validateItemDraft({
        name: "",
        quantity: "abc",
        unit: "",
        amount: "a".repeat(65),
        category: "",
      }),
    ).toEqual({
      name: "name-required",
      quantity: "quantity-not-whole",
      unit: "unit-required",
      amount: "amount-too-long",
      category: "category-required",
    });
    expect(
      hasItemDraftErrors(
        validateItemDraft({
          name: "",
          quantity: "abc",
          unit: "",
          amount: "a".repeat(65),
          category: "",
        }),
      ),
    ).toBe(true);
  });
});
