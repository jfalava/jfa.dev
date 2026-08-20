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
      expect(validateItemDraft({ ...VALID_DRAFT, name })).toEqual({ name: "Enter a name" });
    }
  });

  test("rejects an over-long name", () => {
    expect(validateItemDraft({ ...VALID_DRAFT, name: "x".repeat(201) })).toEqual({
      name: "Name is too long",
    });
  });

  test("rejects missing and non-whole quantities", () => {
    expect(validateItemDraft({ ...VALID_DRAFT, quantity: "" })).toEqual({
      quantity: "Enter a quantity",
    });
    expect(validateItemDraft({ ...VALID_DRAFT, quantity: "   " })).toEqual({
      quantity: "Enter a quantity",
    });
    expect(validateItemDraft({ ...VALID_DRAFT, quantity: "1.5" })).toEqual({
      quantity: "Enter a whole number from 1 to 100000",
    });
    expect(validateItemDraft({ ...VALID_DRAFT, quantity: "many" })).toEqual({
      quantity: "Enter a whole number from 1 to 100000",
    });
  });

  test("rejects quantities outside the 1..100000 range", () => {
    expect(validateItemDraft({ ...VALID_DRAFT, quantity: "0" })).toEqual({
      quantity: "Enter a number from 1 to 100000",
    });
    expect(validateItemDraft({ ...VALID_DRAFT, quantity: "100001" })).toEqual({
      quantity: "Enter a number from 1 to 100000",
    });
    expect(validateItemDraft({ ...VALID_DRAFT, quantity: "100000" })).toEqual({});
  });

  test("rejects a missing or whitespace-only unit", () => {
    for (const unit of ["", "   "]) {
      expect(validateItemDraft({ ...VALID_DRAFT, unit })).toEqual({ unit: "Enter a unit" });
    }
  });

  test("rejects an over-long unit", () => {
    expect(validateItemDraft({ ...VALID_DRAFT, unit: "u".repeat(33) })).toEqual({
      unit: "Unit is too long",
    });
  });

  test("accepts an empty amount but rejects an over-long one", () => {
    expect(validateItemDraft({ ...VALID_DRAFT, amount: "" })).toEqual({});
    expect(validateItemDraft({ ...VALID_DRAFT, amount: "a".repeat(65) })).toEqual({
      amount: "Amount is too long",
    });
  });

  test("rejects a missing or whitespace-only category", () => {
    for (const category of ["", "   "]) {
      expect(validateItemDraft({ ...VALID_DRAFT, category })).toEqual({
        category: "Enter a category",
      });
    }
  });

  test("rejects an over-long category", () => {
    expect(validateItemDraft({ ...VALID_DRAFT, category: "c".repeat(65) })).toEqual({
      category: "Category is too long",
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
      name: "Enter a name",
      quantity: "Enter a whole number from 1 to 100000",
      unit: "Enter a unit",
      amount: "Amount is too long",
      category: "Enter a category",
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
