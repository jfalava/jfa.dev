import { z } from "zod";

import { listAliasSchema } from "./aliases";
import { identityAuthSchema, listIdentitySchema } from "./identities";

const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const LIST_SCHEMA_VERSION = 3 as const;

export const listIdSchema = z
  .string()
  .regex(UUID_V7_PATTERN, "Expected a UUID7 list identifier")
  .transform((value) => value.toLowerCase());

const itemIdSchema = z.string().min(1).max(128);
const archiveIdSchema = z.string().min(1).max(160);
const timestampSchema = z.string().datetime({ offset: true });

export const listItemSchema = z.object({
  id: itemIdSchema,
  name: z.string().trim().min(1).max(200),
  quantity: z.number().int().min(1).max(100_000),
  unit: z.string().trim().min(1).max(32),
  amount: z.string().trim().max(64),
  category: z.string().trim().min(1).max(64),
  checked: z.boolean(),
  position: z.number().int().min(0),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  createdBy: listIdentitySchema.nullable().default(null),
  updatedBy: listIdentitySchema.nullable().default(null),
});

export const deletedListItemSchema = listItemSchema.extend({
  archiveId: archiveIdSchema,
  deletedAt: timestampSchema,
  deletedBy: listIdentitySchema.nullable().default(null),
});

export const listSnapshotSchema = z.object({
  schemaVersion: z.literal(LIST_SCHEMA_VERSION),
  id: listIdSchema,
  alias: listAliasSchema.nullable().default(null),
  title: z.string().trim().min(1).max(160),
  items: z.array(listItemSchema).max(10_000),
  deletedItems: z.array(deletedListItemSchema).default([]),
  revision: z.number().int().min(0),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const listLiveMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("snapshot"), snapshot: listSnapshotSchema }),
  z.object({ type: z.literal("deleted"), listId: listIdSchema }),
]);

const itemInputSchema = z.object({
  id: itemIdSchema,
  name: z.string().trim().min(1).max(200),
  quantity: z.number().int().min(1).max(100_000),
  unit: z.string().trim().min(1).max(32),
  amount: z.string().trim().max(64),
  category: z.string().trim().min(1).max(64),
});

const itemChangesSchema = itemInputSchema.omit({ id: true }).partial();

export const listCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("add-item"), item: itemInputSchema }),
  z.object({
    type: z.literal("update-item"),
    itemId: itemIdSchema,
    changes: itemChangesSchema,
  }),
  z.object({
    type: z.literal("set-item-checked"),
    itemId: itemIdSchema,
    checked: z.boolean(),
  }),
  z.object({ type: z.literal("remove-item"), itemId: itemIdSchema }),
  z.object({
    type: z.literal("restore-item"),
    archiveId: archiveIdSchema,
  }),
  z.object({
    type: z.literal("purge-deleted-item"),
    archiveId: archiveIdSchema,
  }),
  z.object({
    type: z.literal("rename-list"),
    title: z.string().trim().min(1).max(160),
  }),
]);

export const listMutationSchema = z.object({
  id: z.string().min(1).max(128),
  baseRevision: z.number().int().min(0),
  actor: listIdentitySchema.nullable().optional(),
  auth: identityAuthSchema.nullable().optional(),
  command: listCommandSchema,
});

export type ListItem = z.infer<typeof listItemSchema>;
export type DeletedListItem = z.infer<typeof deletedListItemSchema>;
export type ListSnapshot = z.infer<typeof listSnapshotSchema>;
export type ListLiveMessage = z.infer<typeof listLiveMessageSchema>;
export type ListCommand = z.infer<typeof listCommandSchema>;
export type ListMutation = z.infer<typeof listMutationSchema>;

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

export function createListSnapshot(
  id: string,
  options: { title?: string; now?: string } = {},
): ListSnapshot {
  const now = options.now ?? new Date().toISOString();
  return {
    schemaVersion: LIST_SCHEMA_VERSION,
    id: listIdSchema.parse(id),
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
  if (mutation.baseRevision !== snapshot.revision) {
    return null;
  }

  const command = listCommandSchema.parse(mutation.command);
  const actor = mutation.actor
    ? listIdentitySchema.parse(mutation.actor)
    : null;
  let nextItems = snapshot.items;
  let nextDeletedItems = snapshot.deletedItems;
  let nextTitle = snapshot.title;

  switch (command.type) {
    case "add-item":
      nextItems = [
        ...snapshot.items,
        {
          ...command.item,
          position: snapshot.items.length,
          checked: false,
          createdAt: now,
          updatedAt: now,
          createdBy: actor,
          updatedBy: actor,
        },
      ];
      break;
    case "update-item":
      nextItems = snapshot.items.map((item) =>
        item.id === command.itemId
          ? {
              ...item,
              ...command.changes,
              updatedAt: now,
              updatedBy: actor ?? item.updatedBy,
            }
          : item,
      );
      break;
    case "set-item-checked":
      nextItems = snapshot.items.map((item) =>
        item.id === command.itemId
          ? {
              ...item,
              checked: command.checked,
              updatedAt: now,
              updatedBy: actor ?? item.updatedBy,
            }
          : item,
      );
      break;
    case "remove-item":
      {
        const removedItem = snapshot.items.find(
          (item) => item.id === command.itemId,
        );
        nextItems = snapshot.items
          .filter((item) => item.id !== command.itemId)
          .map((item, index) => ({ ...item, position: index }));
        if (removedItem) {
          nextDeletedItems = [
            ...snapshot.deletedItems,
            {
              ...removedItem,
              archiveId: `${removedItem.id}:${snapshot.revision + 1}`,
              deletedAt: now,
              deletedBy: actor,
            },
          ];
        }
      }
      break;
    case "restore-item":
      {
        const deletedItem = snapshot.deletedItems.find(
          (item) => item.archiveId === command.archiveId,
        );
        if (
          deletedItem &&
          !snapshot.items.some((item) => item.id === deletedItem.id)
        ) {
          nextItems = [
            ...snapshot.items,
            {
              id: deletedItem.id,
              name: deletedItem.name,
              quantity: deletedItem.quantity,
              unit: deletedItem.unit,
              amount: deletedItem.amount,
              category: deletedItem.category,
              checked: deletedItem.checked,
              position: snapshot.items.length,
              createdAt: deletedItem.createdAt,
              updatedAt: now,
              createdBy: deletedItem.createdBy,
              updatedBy: actor ?? deletedItem.updatedBy,
            },
          ];
          nextDeletedItems = snapshot.deletedItems.filter(
            (item) => item.archiveId !== command.archiveId,
          );
        }
      }
      break;
    case "purge-deleted-item":
      nextDeletedItems = snapshot.deletedItems.filter(
        (item) => item.archiveId !== command.archiveId,
      );
      break;
    case "rename-list":
      nextTitle = command.title;
      break;
  }

  return {
    ...snapshot,
    title: nextTitle,
    items: nextItems,
    deletedItems: nextDeletedItems,
    revision: snapshot.revision + 1,
    updatedAt: now,
  };
}

export function parseListSnapshot(
  value: z.input<typeof listSnapshotSchema>,
): ListSnapshot {
  return listSnapshotSchema.parse(value);
}

export function parseListMutation(
  value: z.input<typeof listMutationSchema>,
): ListMutation {
  return listMutationSchema.parse(value);
}
