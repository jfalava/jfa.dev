import { listItemFieldsSchema } from "@jfa.dev/common/lists";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import type * as SchemaIssue from "effect/SchemaIssue";

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
  const result = Schema.decodeUnknownResult(listItemFieldsSchema, { errors: "all" })({
    name: draft.name,
    quantity: Number(draft.quantity),
    unit: draft.unit,
    amount: draft.amount,
    category: draft.category,
  });
  if (Result.isSuccess(result)) {
    return {};
  }

  const errors: ItemDraftErrors = {};
  if (draft.quantity.trim() === "") {
    errors.quantity = "Enter a quantity";
  }
  for (const { field, kind } of collectFieldIssues(result.failure.issue)) {
    if (!isItemDraftField(field) || errors[field]) {
      continue;
    }
    const problem = FIELD_PROBLEMS[field];
    if (kind === "too-small") {
      errors[field] = problem.tooSmall ?? problem.fallback;
    } else if (kind === "too-big") {
      errors[field] = problem.tooBig ?? problem.fallback;
    } else if (kind === "invalid") {
      errors[field] = problem.invalid ?? problem.fallback;
    } else {
      errors[field] = problem.fallback;
    }
  }
  return errors;
}

type DraftIssueKind = "too-small" | "too-big" | "invalid" | "other";

/**
 * Flattens an Effect schema failure into per-field issue kinds. Filter issues
 * carry the check id (e.g. `effect/schema/isMinLength`) that maps back to the
 * draft problem taxonomy; missing keys behave like an empty value.
 */
function collectFieldIssues(failure: SchemaIssue.Issue): Array<{
  field: PropertyKey | undefined;
  kind: DraftIssueKind;
}> {
  const collected: Array<{ field: PropertyKey | undefined; kind: DraftIssueKind }> = [];
  const walk = (issue: SchemaIssue.Issue, path: ReadonlyArray<PropertyKey>): void => {
    if (issue._tag === "Pointer") {
      walk(issue.issue, [...path, ...issue.path]);
      return;
    }
    if (issue._tag === "Composite" || issue._tag === "AnyOf") {
      for (const inner of issue.issues ?? []) {
        walk(inner, path);
      }
      return;
    }
    const field = path[0];
    collected.push({ field, kind: issueKind(issue) });
  };
  walk(failure, []);
  return collected;
}

function issueKind(issue: SchemaIssue.Issue): DraftIssueKind {
  if (issue._tag === "MissingKey") {
    return "too-small";
  }
  if (issue._tag === "Filter") {
    const id = issue.filter.annotations?.representation?.id;
    if (id?.includes("isMinLength") || id?.includes("isGreaterThanOrEqualTo")) {
      return "too-small";
    }
    if (id?.includes("isMaxLength") || id?.includes("isLessThanOrEqualTo")) {
      return "too-big";
    }
    return "other";
  }
  if (issue._tag === "InvalidType" || issue._tag === "InvalidValue") {
    return "invalid";
  }
  return "other";
}

export function hasItemDraftErrors(errors: ItemDraftErrors): boolean {
  return Object.keys(errors).length > 0;
}
