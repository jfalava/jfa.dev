import { listItemFieldsSchema } from "@jfa.dev/common/lists";

/**
 * The string-based draft of an editable item row, as held by the new-item and
 * edit forms in the list page. The quantity is kept as a string while being
 * typed and is coerced to a number only for schema validation.
 */
export type ItemDraftField = "name" | "quantity" | "unit" | "amount" | "category";
export type ItemDraft = Record<ItemDraftField, string>;
export type ItemDraftErrors = {
  name?: string;
  quantity?: string;
  unit?: string;
  amount?: string;
  category?: string;
};

type FieldProblem = {
  tooSmall?: string;
  tooBig?: string;
  invalid?: string;
  fallback: string;
};

type FieldProblems = {
  name: FieldProblem;
  quantity: FieldProblem;
  unit: FieldProblem;
  amount: FieldProblem;
  category: FieldProblem;
};

const FIELD_PROBLEMS: FieldProblems = {
  name: {
    tooSmall: "Enter a name",
    tooBig: "Name is too long",
    fallback: "Enter a name",
  },
  quantity: {
    tooSmall: "Enter a number from 1 to 100000",
    tooBig: "Enter a number from 1 to 100000",
    invalid: "Enter a whole number from 1 to 100000",
    fallback: "Enter a whole number from 1 to 100000",
  },
  unit: {
    tooSmall: "Enter a unit",
    tooBig: "Unit is too long",
    fallback: "Enter a unit",
  },
  amount: {
    tooBig: "Amount is too long",
    fallback: "Enter a valid amount",
  },
  category: {
    tooSmall: "Enter a category",
    tooBig: "Category is too long",
    fallback: "Enter a category",
  },
};

function isItemDraftField(value: PropertyKey | undefined): value is ItemDraftField {
  return (
    value === "name" ||
    value === "quantity" ||
    value === "unit" ||
    value === "amount" ||
    value === "category"
  );
}

/**
 * Validates a string-based item draft against the canonical item fields schema
 * and returns a per-field error message for every rejected field. An empty
 * result means the draft passes the schema unchanged.
 */
export function validateItemDraft(draft: ItemDraft): ItemDraftErrors {
  const result = listItemFieldsSchema.safeParse({
    name: draft.name,
    quantity: Number(draft.quantity),
    unit: draft.unit,
    amount: draft.amount,
    category: draft.category,
  });
  if (result.success) {
    return {};
  }

  const errors: ItemDraftErrors = {};
  if (draft.quantity.trim() === "") {
    errors.quantity = "Enter a quantity";
  }
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (!isItemDraftField(field) || errors[field]) {
      continue;
    }
    const problem = FIELD_PROBLEMS[field];
    if (issue.code === "too_small") {
      errors[field] = problem.tooSmall ?? problem.fallback;
    } else if (issue.code === "too_big") {
      errors[field] = problem.tooBig ?? problem.fallback;
    } else if (issue.code === "invalid_type") {
      errors[field] = problem.invalid ?? problem.fallback;
    } else {
      errors[field] = problem.fallback;
    }
  }
  return errors;
}

export function hasItemDraftErrors(errors: ItemDraftErrors): boolean {
  return Object.keys(errors).length > 0;
}
