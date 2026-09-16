import { listAliasSchema } from "./aliases";
import {
  identityAuthSchema,
  listIdentitySchema,
  timestampSchema,
  type ListIdentity,
} from "./identities";

import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";

const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const LIST_SCHEMA_VERSION = 3 as const;

/** Cap on retained deleted-item history; the oldest entries are dropped past this. */
export const MAX_DELETED_ITEMS = 100 as const;

/**
 * Cap on retained item mutation history per list, as a revision window: events
 * for mutations older than the newest revision minus this value are pruned.
 */
export const MAX_ITEM_HISTORY_REVISIONS = 1000 as const;

export const listIdSchema = Schema.String.check(Schema.isPattern(UUID_V7_PATTERN)).pipe(
  Schema.decode({
    decode: SchemaGetter.transform((value: string) => value.toLowerCase()),
    encode: SchemaGetter.transform((value: string) => value),
  }),
);

const itemIdSchema = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(128));
const archiveIdSchema = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(160));

/** Present-or-absent identity that always decodes to an explicit `null`. */
const listIdentityField = Schema.NullOr(listIdentitySchema).pipe(
  Schema.withDecodingDefault(Effect.succeed(null)),
);

const nameField = Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(200));
const quantityField = Schema.Int.check(
  Schema.isGreaterThanOrEqualTo(0),
  Schema.isLessThanOrEqualTo(100_000),
);
const positiveQuantityField = Schema.Int.check(
  Schema.isGreaterThanOrEqualTo(1),
  Schema.isLessThanOrEqualTo(100_000),
);

/** Quantity captured when an item enters Inventory; null means it is on the list. */
const inventoryQuantityField = Schema.NullOr(quantityField).pipe(
  Schema.withDecodingDefault(Effect.succeed(null)),
);
const unitField = Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(32));
const amountField = Schema.Trim.check(Schema.isMaxLength(64));
const categoryField = Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(64));
const titleField = Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(160));

const listItemFields = {
  id: itemIdSchema,
  name: nameField,
  quantity: quantityField,
  unit: unitField,
  amount: amountField,
  category: categoryField,
  inventoryQuantity: inventoryQuantityField,
  checked: Schema.Boolean,
  position: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  createdBy: listIdentityField,
  updatedBy: listIdentityField,
};

export const listItemSchema = Schema.Struct(listItemFields);

export const deletedListItemSchema = Schema.Struct({
  ...listItemFields,
  archiveId: archiveIdSchema,
  deletedAt: timestampSchema,
  deletedBy: listIdentityField,
});

const nullableAliasField = Schema.NullOr(listAliasSchema).pipe(
  Schema.withDecodingDefault(Effect.succeed(null)),
);

export const listSnapshotSchema = Schema.Struct({
  schemaVersion: Schema.Literal(LIST_SCHEMA_VERSION),
  id: listIdSchema,
  alias: nullableAliasField,
  title: titleField,
  items: Schema.Array(listItemSchema).check(Schema.isMaxLength(10_000)),
  deletedItems: Schema.Array(deletedListItemSchema).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed([])),
  ),
  revision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

/** Editable item fields, shared by add/update commands and client-side draft validation. */
const editableListItemFieldSpecs = {
  name: nameField,
  quantity: positiveQuantityField,
  unit: unitField,
  amount: amountField,
  category: categoryField,
};

export const listItemFieldsSchema = Schema.Struct({
  ...editableListItemFieldSpecs,
  quantity: quantityField,
});

const itemInputSchema = Schema.Struct({
  ...editableListItemFieldSpecs,
  id: itemIdSchema,
});

const itemChangesSchema = Schema.Struct({
  name: Schema.optional(nameField),
  quantity: Schema.optional(quantityField),
  unit: Schema.optional(unitField),
  amount: Schema.optional(amountField),
  category: Schema.optional(categoryField),
});

export const listCommandSchema = Schema.Union([
  Schema.Struct({ type: Schema.Literal("add-item"), item: itemInputSchema }),
  Schema.Struct({
    type: Schema.Literal("update-item"),
    itemId: itemIdSchema,
    changes: itemChangesSchema,
  }),
  Schema.Struct({
    type: Schema.Literal("set-item-checked"),
    itemId: itemIdSchema,
    checked: Schema.Boolean,
  }),
  Schema.Struct({ type: Schema.Literal("remove-item"), itemId: itemIdSchema }),
  Schema.Struct({ type: Schema.Literal("restore-item"), archiveId: archiveIdSchema }),
  Schema.Struct({ type: Schema.Literal("purge-deleted-item"), archiveId: archiveIdSchema }),
  Schema.Struct({ type: Schema.Literal("rename-list"), title: titleField }),
]);

const listMutationBaseFields = {
  id: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(128)),
  baseRevision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  actor: Schema.optional(Schema.NullOr(listIdentitySchema)),
};

export const listMutationSchema = Schema.Struct({
  ...listMutationBaseFields,
  auth: Schema.optional(Schema.NullOr(identityAuthSchema)),
  command: listCommandSchema,
});

/** Mutation shape broadcast to live sessions (no auth signature). */
export const liveListMutationSchema = Schema.Struct({
  ...listMutationBaseFields,
  command: listCommandSchema,
});

export const listLiveMessageSchema = Schema.Union([
  Schema.Struct({ type: Schema.Literal("snapshot"), snapshot: listSnapshotSchema }),
  Schema.Struct({
    type: Schema.Literal("mutation"),
    mutation: liveListMutationSchema,
    appliedAt: timestampSchema,
  }),
  Schema.Struct({ type: Schema.Literal("deleted"), listId: listIdSchema }),
]);

export type ListItem = Schema.Schema.Type<typeof listItemSchema>;
export type DeletedListItem = Schema.Schema.Type<typeof deletedListItemSchema>;
export type ListSnapshot = Schema.Schema.Type<typeof listSnapshotSchema>;
export type ListLiveMessage = Schema.Schema.Type<typeof listLiveMessageSchema>;
export type ListCommand = Schema.Schema.Type<typeof listCommandSchema>;
export type ListMutation = Schema.Schema.Type<typeof listMutationSchema>;
export type LiveListMutation = Schema.Schema.Type<typeof liveListMutationSchema>;

export type ListBackend = "local" | "remote";
export type RemoteListRole = "owner" | "collaborator";

export interface ListSummary {
  id: string;
  alias: string | null;
  title: string;
  itemCount: number;
  completedCount: number;
  deletedItemCount: number;
  updatedAt: string;
  backend: ListBackend;
  remoteRole?: RemoteListRole;
}

export type ApplyMutationResult =
  | { status: "ok"; snapshot: ListSnapshot }
  | { status: "conflict"; snapshot: ListSnapshot }
  | { status: "missing" }
  | { status: "unauthorized" };

export type ImportSnapshotResult =
  | { status: "imported"; snapshot: ListSnapshot }
  | { status: "already-imported"; snapshot: ListSnapshot }
  | { status: "conflict"; snapshot: ListSnapshot }
  | { status: "alias-conflict"; snapshot: ListSnapshot }
  | { status: "unauthorized" };

export interface ListSnapshotDiff {
  upsertItems: ListItem[];
  deleteItemIds: string[];
  upsertDeletedItems: DeletedListItem[];
  deleteArchiveIds: string[];
}

export interface AppliedListMutation {
  snapshot: ListSnapshot;
  diff: ListSnapshotDiff;
  noop: boolean;
}

export const listItemHistoryEventSchema = Schema.Struct({
  id: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(160)),
  mutationId: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(128)),
  itemId: itemIdSchema,
  revision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  actor: Schema.NullOr(listIdentitySchema),
  command: listCommandSchema,
  appliedAt: timestampSchema,
});

export const listItemHistoryPageSchema = Schema.Struct({
  events: Schema.Array(listItemHistoryEventSchema),
  /** Revision of the oldest returned event; pass as `beforeRevision` for the next page. */
  nextCursor: Schema.NullOr(Schema.Int.check(Schema.isGreaterThanOrEqualTo(1))),
});

export const listItemHistoryQuerySchema = Schema.Struct({
  itemId: itemIdSchema,
  limit: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1), Schema.isLessThanOrEqualTo(100)).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(50)),
  ),
  beforeRevision: Schema.optional(
    Schema.NullishOr(Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))),
  ),
});

export type ListItemHistoryEvent = Schema.Schema.Type<typeof listItemHistoryEventSchema>;
export type ListItemHistoryPage = Schema.Schema.Type<typeof listItemHistoryPageSchema>;
export type ListItemHistoryQuery = Schema.Codec.Encoded<typeof listItemHistoryQuerySchema>;

export type ListItemHistoryResult =
  | { status: "ok"; page: ListItemHistoryPage }
  | { status: "missing" };

/**
 * Item ids a command's history events should be recorded for, derived from the
 * command itself plus the snapshot it was applied to and the resulting diff.
 */
export function itemHistoryItemIds(
  command: ListCommand,
  snapshotBefore: ListSnapshot,
  diff: ListSnapshotDiff,
): string[] {
  switch (command.type) {
    case "add-item":
      return [command.item.id];
    case "update-item":
    case "set-item-checked":
    case "remove-item":
      return [command.itemId];
    case "restore-item":
      return diff.upsertItems.map((item) => item.id);
    case "purge-deleted-item": {
      const purged = snapshotBefore.deletedItems.find(
        (item) => item.archiveId === command.archiveId,
      );
      return purged ? [purged.id] : [];
    }
    case "rename-list":
      return [];
    default:
      return [];
  }
}

export function createListSnapshot(
  id: string,
  options: { title?: string; now?: string } = {},
): ListSnapshot {
  const now = options.now ?? new Date().toISOString();
  return {
    schemaVersion: LIST_SCHEMA_VERSION,
    id: Schema.decodeUnknownSync(listIdSchema)(id),
    alias: null,
    title: options.title ?? "New list",
    items: [],
    deletedItems: [],
    revision: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function createStarterListSnapshot(
  id: string,
  options: { title?: string; now?: string } = {},
): ListSnapshot {
  const snapshot = createListSnapshot(id, options);
  const now = options.now ?? snapshot.createdAt;

  return {
    ...snapshot,
    items: [
      {
        id: "starter-bread",
        name: "Bread",
        quantity: 1,
        unit: "EA",
        amount: "",
        category: "BAKERY",
        inventoryQuantity: null,
        checked: false,
        position: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: null,
        updatedBy: null,
      },
      {
        id: "starter-tomatoes",
        name: "Tomatoes",
        quantity: 6,
        unit: "EA",
        amount: "",
        category: "PRODUCE",
        inventoryQuantity: null,
        checked: false,
        position: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: null,
        updatedBy: null,
      },
      {
        id: "starter-coffee",
        name: "Coffee",
        quantity: 1,
        unit: "BAG",
        amount: "",
        category: "PANTRY",
        inventoryQuantity: 1,
        checked: true,
        position: 2,
        createdAt: now,
        updatedAt: now,
        createdBy: null,
        updatedBy: null,
      },
    ],
  };
}

export function summarizeList(
  snapshot: ListSnapshot,
  backend: ListBackend,
  remoteRole?: RemoteListRole,
): ListSummary {
  const summary: ListSummary = {
    id: snapshot.id,
    alias: snapshot.alias,
    title: snapshot.title,
    itemCount: snapshot.items.length,
    completedCount: snapshot.items.filter((item) => item.checked).length,
    deletedItemCount: snapshot.deletedItems.length,
    updatedAt: snapshot.updatedAt,
    backend,
  };
  if (backend === "remote" && remoteRole) {
    summary.remoteRole = remoteRole;
  }
  return summary;
}

export function applyListMutation(
  snapshot: ListSnapshot,
  mutation: ListMutation,
  now = new Date().toISOString(),
): ListSnapshot | null {
  return applyListMutationWithDiff(snapshot, mutation, now)?.snapshot ?? null;
}

/**
 * Applies a signed mutation and returns the resulting snapshot together with
 * the minimal storage diff, computed inline so no full-snapshot comparison is
 * needed on the persistence path.
 */
export function applyListMutationWithDiff(
  snapshot: ListSnapshot,
  mutation: ListMutation,
  now = new Date().toISOString(),
): AppliedListMutation | null {
  if (mutation.baseRevision !== snapshot.revision) {
    return null;
  }

  const command = Schema.decodeUnknownSync(listCommandSchema)(mutation.command);
  const actor = mutation.actor
    ? Schema.decodeUnknownSync(listIdentitySchema)(mutation.actor)
    : null;
  let nextItems = snapshot.items;
  let nextDeletedItems = snapshot.deletedItems;
  let nextTitle = snapshot.title;
  const diff: ListSnapshotDiff = {
    upsertItems: [],
    deleteItemIds: [],
    upsertDeletedItems: [],
    deleteArchiveIds: [],
  };

  switch (command.type) {
    case "add-item": {
      const item: ListItem = {
        ...command.item,
        inventoryQuantity: null,
        position: nextItemPosition(snapshot.items),
        checked: false,
        createdAt: now,
        updatedAt: now,
        createdBy: actor,
        updatedBy: actor,
      };
      nextItems = [...snapshot.items, item];
      diff.upsertItems.push(item);
      break;
    }
    case "update-item":
    case "set-item-checked": {
      const mapped = applyItemCommand(
        snapshot.items,
        command,
        actor,
        now,
        diff,
      );
      if (mapped === INVALID_ITEM_COMMAND) {
        return null;
      }
      if (mapped === null) {
        return { snapshot, diff, noop: true };
      }
      nextItems = mapped;
      break;
    }
    case "remove-item": {
      const removed = applyRemoveItem(snapshot, command.itemId, actor, now, diff);
      nextItems = removed.items;
      nextDeletedItems = removed.deletedItems;
      break;
    }
    case "restore-item": {
      const deletedItem = snapshot.deletedItems.find(
        (item) => item.archiveId === command.archiveId,
      );
      if (deletedItem && !snapshot.items.some((item) => item.id === deletedItem.id)) {
        const restoredItem = buildRestoredItem(
          deletedItem,
          nextItemPosition(snapshot.items),
          actor,
          now,
        );
        nextItems = [...snapshot.items, restoredItem];
        nextDeletedItems = snapshot.deletedItems.filter(
          (item) => item.archiveId !== command.archiveId,
        );
        diff.upsertItems.push(restoredItem);
        diff.deleteArchiveIds.push(command.archiveId);
      }
      break;
    }
    case "purge-deleted-item": {
      const exists = snapshot.deletedItems.some((item) => item.archiveId === command.archiveId);
      nextDeletedItems = snapshot.deletedItems.filter(
        (item) => item.archiveId !== command.archiveId,
      );
      if (exists) {
        diff.deleteArchiveIds.push(command.archiveId);
      }
      break;
    }
    case "rename-list":
      nextTitle = command.title;
      break;
  }

  return {
    snapshot: {
      ...snapshot,
      title: nextTitle,
      items: [...nextItems].toSorted(compareListItemsByPosition),
      deletedItems: nextDeletedItems,
      revision: snapshot.revision + 1,
      updatedAt: now,
    },
    diff,
    noop: false,
  };
}

export function parseListSnapshot(
  value: Schema.Codec.Encoded<typeof listSnapshotSchema>,
): ListSnapshot {
  return Schema.decodeUnknownSync(listSnapshotSchema)(value);
}

type ItemFieldCommand = Extract<
  ListCommand,
  { type: "update-item" | "set-item-checked" }
>;
const INVALID_ITEM_COMMAND = Symbol("invalid-item-command");

function applyRemoveItem(
  snapshot: ListSnapshot,
  itemId: string,
  actor: ListIdentity | null,
  now: string,
  diff: ListSnapshotDiff,
) {
  // Sparse positions: survivors keep their ranks so remove is O(1) row writes.
  const items = snapshot.items.filter((item) => item.id !== itemId);
  const removedItem = snapshot.items.find((item) => item.id === itemId);
  if (!removedItem) {
    return { items, deletedItems: snapshot.deletedItems };
  }

  const archivedItem: DeletedListItem = {
    ...removedItem,
    archiveId: `${removedItem.id}:${snapshot.revision + 1}`,
    deletedAt: now,
    deletedBy: actor,
  };
  diff.deleteItemIds.push(removedItem.id);
  diff.upsertDeletedItems.push(archivedItem);
  return {
    items,
    deletedItems: trimDeletedItems(
      [...snapshot.deletedItems, archivedItem],
      diff,
    ),
  };
}

function applyItemCommand(
  items: readonly ListItem[],
  command: ItemFieldCommand,
  actor: ListIdentity | null,
  now: string,
  diff: ListSnapshotDiff,
): readonly ListItem[] | null | typeof INVALID_ITEM_COMMAND {
  if (isInvalidOpenQuantityUpdate(items, command)) {
    return INVALID_ITEM_COMMAND;
  }
  return mapCheckedOrUpdatedItem(items, command, actor, now, diff);
}

function mapCheckedOrUpdatedItem(
  items: readonly ListItem[],
  command: ItemFieldCommand,
  actor: ListIdentity | null,
  now: string,
  diff: ListSnapshotDiff,
): readonly ListItem[] | null {
  const current = items.find((item) => item.id === command.itemId);
  if (!current) {
    return null;
  }

  if (
    command.type === "set-item-checked"
      ? current.checked === command.checked
      : !itemChangesDiffer(current, command.changes)
  ) {
    return null;
  }

  const changes = getItemChanges(current, command);
  return mapUpdatedItem(
    items,
    command.itemId,
    (item) => ({
      ...item,
      ...changes,
      updatedAt: now,
      updatedBy: actor ?? item.updatedBy,
    }),
    diff,
  );
}

function isInvalidOpenQuantityUpdate(
  items: readonly ListItem[],
  command: ItemFieldCommand,
): boolean {
  return (
    command.type === "update-item" &&
    command.changes.quantity === 0 &&
    items.some((item) => item.id === command.itemId && !item.checked)
  );
}

function getItemChanges(
  current: ListItem,
  command: ItemFieldCommand,
): Schema.Schema.Type<typeof itemChangesSchema> &
  Partial<Pick<ListItem, "checked" | "inventoryQuantity">> {
  if (command.type === "update-item") {
    return command.changes;
  }
  if (command.checked) {
    return { checked: true, inventoryQuantity: current.quantity };
  }
  return {
    checked: false,
    quantity: current.inventoryQuantity ?? current.quantity,
    inventoryQuantity: null,
  };
}

function itemChangesDiffer(
  item: ListItem,
  changes: Schema.Schema.Type<typeof itemChangesSchema>,
): boolean {
  return (
    (changes.name !== undefined && changes.name !== item.name) ||
    (changes.quantity !== undefined && changes.quantity !== item.quantity) ||
    (changes.unit !== undefined && changes.unit !== item.unit) ||
    (changes.amount !== undefined && changes.amount !== item.amount) ||
    (changes.category !== undefined && changes.category !== item.category)
  );
}

function mapUpdatedItem(
  items: readonly ListItem[],
  itemId: string,
  update: (item: ListItem) => ListItem,
  diff: ListSnapshotDiff,
): readonly ListItem[] {
  return items.map((item) => {
    if (item.id !== itemId) {
      return item;
    }
    const updated = update(item);
    if (!listItemsEqual(item, updated)) {
      diff.upsertItems.push(updated);
    }
    return updated;
  });
}

function buildRestoredItem(
  deletedItem: DeletedListItem,
  position: number,
  actor: ListIdentity | null,
  now: string,
): ListItem {
  return {
    id: deletedItem.id,
    name: deletedItem.name,
    quantity:
      deletedItem.checked && deletedItem.inventoryQuantity !== null
        ? deletedItem.inventoryQuantity
        : deletedItem.quantity,
    unit: deletedItem.unit,
    amount: deletedItem.amount,
    category: deletedItem.category,
    inventoryQuantity: deletedItem.inventoryQuantity,
    checked: deletedItem.checked,
    position,
    createdAt: deletedItem.createdAt,
    updatedAt: now,
    createdBy: deletedItem.createdBy,
    updatedBy: actor ?? deletedItem.updatedBy,
  };
}

function trimDeletedItems(
  items: readonly DeletedListItem[],
  diff: ListSnapshotDiff,
): readonly DeletedListItem[] {
  if (items.length <= MAX_DELETED_ITEMS) {
    return items;
  }
  const overflow = items.length - MAX_DELETED_ITEMS;
  const dropped = items.slice(0, overflow);
  for (const item of dropped) {
    diff.deleteArchiveIds.push(item.archiveId);
  }
  return items.slice(overflow);
}

function nextItemPosition(items: readonly ListItem[]): number {
  let maxPosition = -1;
  for (const item of items) {
    if (item.position > maxPosition) {
      maxPosition = item.position;
    }
  }
  return maxPosition + 1;
}

/** Sort key for list order: sparse positions ascending, id as stable tie-break. */
export function compareListItemsByPosition(left: ListItem, right: ListItem): number {
  if (left.position !== right.position) {
    return left.position - right.position;
  }
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function identitiesEqual(left: ListIdentity | null, right: ListIdentity | null): boolean {
  return left?.id === right?.id && left?.username === right?.username;
}

function listItemsEqual(left: ListItem, right: ListItem): boolean {
  return (
    left.id === right.id &&
    left.name === right.name &&
    left.quantity === right.quantity &&
    left.unit === right.unit &&
    left.amount === right.amount &&
    left.category === right.category &&
    left.inventoryQuantity === right.inventoryQuantity &&
    left.checked === right.checked &&
    left.position === right.position &&
    left.createdAt === right.createdAt &&
    left.updatedAt === right.updatedAt &&
    identitiesEqual(left.createdBy, right.createdBy) &&
    identitiesEqual(left.updatedBy, right.updatedBy)
  );
}

export function parseListMutation(
  value: Schema.Codec.Encoded<typeof listMutationSchema>,
): ListMutation {
  return Schema.decodeUnknownSync(listMutationSchema)(value);
}
