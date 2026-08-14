import { z } from "zod";

const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const LIST_SCHEMA_VERSION = 1 as const;

export const listIdSchema = z
  .string()
  .regex(UUID_V7_PATTERN, "Expected a UUID7 list identifier")
  .transform((value) => value.toLowerCase());

const itemIdSchema = z.string().min(1).max(128);
const timestampSchema = z.string().datetime({ offset: true });

export const listItemSchema = z.object({
  id: itemIdSchema,
  name: z.string().trim().min(1).max(200),
  quantity: z.number().int().min(1).max(100_000),
  unit: z.string().trim().min(1).max(32),
  category: z.string().trim().min(1).max(64),
  checked: z.boolean(),
  position: z.number().int().min(0),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const listSnapshotSchema = z.object({
  schemaVersion: z.literal(LIST_SCHEMA_VERSION),
  id: listIdSchema,
  title: z.string().trim().min(1).max(160),
  items: z.array(listItemSchema).max(10_000),
  revision: z.number().int().min(0),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const itemInputSchema = z.object({
  id: itemIdSchema,
  name: z.string().trim().min(1).max(200),
  quantity: z.number().int().min(1).max(100_000),
  unit: z.string().trim().min(1).max(32),
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
    type: z.literal("rename-list"),
    title: z.string().trim().min(1).max(160),
  }),
]);

export const listMutationSchema = z.object({
  id: z.string().min(1).max(128),
  baseRevision: z.number().int().min(0),
  command: listCommandSchema,
});

export type ListItem = z.infer<typeof listItemSchema>;
export type ListSnapshot = z.infer<typeof listSnapshotSchema>;
export type ListCommand = z.infer<typeof listCommandSchema>;
export type ListMutation = z.infer<typeof listMutationSchema>;

export type ListBackend = "local" | "remote";

export interface ListSummary {
  id: string;
  title: string;
  itemCount: number;
  completedCount: number;
  updatedAt: string;
  backend: ListBackend;
}

export type ApplyMutationResult =
  | { status: "ok"; snapshot: ListSnapshot }
  | { status: "conflict"; snapshot: ListSnapshot }
  | { status: "missing" };

export type ImportSnapshotResult =
  | { status: "imported"; snapshot: ListSnapshot }
  | { status: "already-imported"; snapshot: ListSnapshot }
  | { status: "conflict"; snapshot: ListSnapshot };

export function createListSnapshot(
  id: string,
  options: { title?: string; now?: string } = {},
): ListSnapshot {
  const now = options.now ?? new Date().toISOString();
  return {
    schemaVersion: LIST_SCHEMA_VERSION,
    id: listIdSchema.parse(id),
    title: options.title ?? "Weekend groceries",
    items: [],
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
        category: "BAKERY",
        checked: false,
        position: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "starter-tomatoes",
        name: "Tomatoes",
        quantity: 6,
        unit: "EA",
        category: "PRODUCE",
        checked: false,
        position: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "starter-coffee",
        name: "Coffee",
        quantity: 1,
        unit: "BAG",
        category: "PANTRY",
        checked: true,
        position: 2,
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

export function summarizeList(
  snapshot: ListSnapshot,
  backend: ListBackend,
): ListSummary {
  return {
    id: snapshot.id,
    title: snapshot.title,
    itemCount: snapshot.items.length,
    completedCount: snapshot.items.filter((item) => item.checked).length,
    updatedAt: snapshot.updatedAt,
    backend,
  };
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
  let nextItems = snapshot.items;
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
        },
      ];
      break;
    case "update-item":
      nextItems = snapshot.items.map((item) =>
        item.id === command.itemId
          ? { ...item, ...command.changes, updatedAt: now }
          : item,
      );
      break;
    case "set-item-checked":
      nextItems = snapshot.items.map((item) =>
        item.id === command.itemId
          ? { ...item, checked: command.checked, updatedAt: now }
          : item,
      );
      break;
    case "remove-item":
      nextItems = snapshot.items
        .filter((item) => item.id !== command.itemId)
        .map((item, index) => ({ ...item, position: index }));
      break;
    case "rename-list":
      nextTitle = command.title;
      break;
  }

  return {
    ...snapshot,
    title: nextTitle,
    items: nextItems,
    revision: snapshot.revision + 1,
    updatedAt: now,
  };
}

export function parseListSnapshot(value: unknown): ListSnapshot {
  return listSnapshotSchema.parse(value);
}

export function parseListMutation(value: unknown): ListMutation {
  return listMutationSchema.parse(value);
}
