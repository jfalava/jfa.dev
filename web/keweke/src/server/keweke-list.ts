import { listAliasSchema } from "@jfa.dev/common/aliases";
import { listMutationSigningPayload } from "@jfa.dev/common/crypto";
import {
  identityIdSchema,
  listIdentitySchema,
  publishAuthSchema,
  type ListIdentity,
  type PublishAuth,
} from "@jfa.dev/common/identities";
import {
  LIST_SCHEMA_VERSION,
  MAX_DELETED_ITEMS,
  MAX_ITEM_HISTORY_REVISIONS,
  applyListMutationWithDiff,
  itemHistoryItemIds,
  listCommandSchema,
  listIdSchema,
  listItemHistoryEventSchema,
  listItemHistoryQuerySchema,
  parseListMutation,
  parseListSnapshot,
  type ApplyMutationResult,
  type DeletedListItem,
  type ImportSnapshotResult,
  type ListItem,
  type ListItemHistoryQuery,
  type ListItemHistoryResult,
  type ListCommand,
  type ListLiveMessage,
  type ListMutation,
  type ListSnapshot,
  type ListSnapshotDiff,
  type LiveListMutation,
} from "@jfa.dev/common/lists";
import { DurableObject } from "cloudflare:workers";
import { uuidv7 } from "uuidv7";

interface ListMetadataRow {
  [key: string]: string | number | null;
  list_id: string;
  alias: string | null;
  title: string;
  revision: number;
  created_at: string;
  updated_at: string;
  owner_user_id: string | null;
}

interface ListItemRow {
  [key: string]: string | number | null;
  id: string;
  name: string;
  quantity: number;
  unit: string;
  amount: string;
  category: string;
  checked: number;
  position: number;
  created_at: string;
  updated_at: string;
  created_by_id: string | null;
  created_by_username: string | null;
  updated_by_id: string | null;
  updated_by_username: string | null;
}

interface DeletedListItemRow {
  [key: string]: string | number | null;
  archive_id: string;
  item_id: string;
  name: string;
  quantity: number;
  unit: string;
  amount: string;
  category: string;
  checked: number;
  position: number;
  created_at: string;
  updated_at: string;
  deleted_at: string;
  created_by_id: string | null;
  created_by_username: string | null;
  updated_by_id: string | null;
  updated_by_username: string | null;
  deleted_by_id: string | null;
  deleted_by_username: string | null;
}

type WebSocketPairConstructor = new () => { 0: WebSocket; 1: WebSocket };
declare const WebSocketPair: WebSocketPairConstructor;

/** Number of recent mutation ids retained for idempotent dedupe before pruning. */
const APPLIED_MUTATION_RETENTION = 100;

interface ItemHistoryWrite {
  mutationId: string;
  actor: ListIdentity | null;
  command: ListCommand;
  appliedAt: string;
  itemIds: readonly string[];
}

interface ItemHistoryRow {
  [key: string]: string | number | null;
  id: string;
  mutation_id: string;
  item_id: string;
  revision: number;
  actor_id: string | null;
  actor_username: string | null;
  command: string;
  applied_at: string;
}

export type ListDeletionResult =
  | { status: "deleted"; alias: string | null }
  | { status: "missing"; alias: null }
  | { status: "unauthorized"; alias: null };

export class KewekeList extends DurableObject {
  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => this.migrate());
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const snapshot = this.readSnapshot();
    if (!snapshot) {
      return new Response("List not found", { status: 404 });
    }

    const webSocketPair = new WebSocketPair();
    const client = webSocketPair[0];
    const server = webSocketPair[1];
    this.ctx.acceptWebSocket(server, ["list"]);
    server.send(JSON.stringify({ type: "snapshot", snapshot } satisfies ListLiveMessage));

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async getSnapshot(listId: string): Promise<ListSnapshot | null> {
    const normalizedListId = listIdSchema.parse(listId);
    const snapshot = this.readSnapshot();
    if (!snapshot || snapshot.id !== normalizedListId) {
      return null;
    }
    return snapshot;
  }

  async getItemHistory(
    listId: string,
    query: ListItemHistoryQuery,
  ): Promise<ListItemHistoryResult> {
    const normalizedListId = listIdSchema.parse(listId);
    const parsedQuery = listItemHistoryQuerySchema.parse(query);
    const metadata = this.readMetadata();
    if (!metadata || metadata.list_id !== normalizedListId) {
      return { status: "missing" };
    }

    const beforeRevision = parsedQuery.beforeRevision ?? null;
    const rows = this.ctx.storage.sql
      .exec<ItemHistoryRow>(
        `SELECT id, mutation_id, item_id, revision, actor_id, actor_username, command, applied_at
         FROM item_history
         WHERE list_id = ? AND item_id = ? AND (? IS NULL OR revision < ?)
         ORDER BY revision DESC, id DESC
         LIMIT ?`,
        normalizedListId,
        parsedQuery.itemId,
        beforeRevision,
        beforeRevision,
        parsedQuery.limit + 1,
      )
      .toArray();

    const hasMore = rows.length > parsedQuery.limit;
    const events = rows.slice(0, parsedQuery.limit).flatMap((row) => {
      const parsed = listItemHistoryEventSchema.safeParse({
        id: row.id,
        mutationId: row.mutation_id,
        itemId: row.item_id,
        revision: row.revision,
        actor: readIdentity(row.actor_id, row.actor_username),
        command: parseStoredCommand(row.command),
        appliedAt: row.applied_at,
      });
      return parsed.success ? [parsed.data] : [];
    });

    return {
      status: "ok",
      page: {
        events,
        nextCursor: hasMore && events.length > 0 ? events[events.length - 1].revision : null,
      },
    };
  }

  async deleteOwnedList(ownerUserId: string): Promise<ListDeletionResult> {
    const normalizedOwnerUserId = identityIdSchema.parse(ownerUserId);
    const metadata = this.readMetadata();
    if (!metadata) {
      return { status: "missing", alias: null };
    }
    if (metadata.owner_user_id !== normalizedOwnerUserId) {
      return { status: "unauthorized", alias: null };
    }

    const normalizedListId = listIdSchema.parse(metadata.list_id);
    const alias = metadata.alias;
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec("DELETE FROM items");
      this.ctx.storage.sql.exec("DELETE FROM deleted_items");
      this.ctx.storage.sql.exec("DELETE FROM applied_mutations");
      this.ctx.storage.sql.exec("DELETE FROM item_history");
      this.ctx.storage.sql.exec("DELETE FROM imports");
      this.ctx.storage.sql.exec("DELETE FROM metadata");
    });
    this.broadcast({ type: "deleted", listId: normalizedListId });
    for (const webSocket of this.ctx.getWebSockets("list")) {
      webSocket.close(1000, "List deleted");
    }
    return { status: "deleted", alias };
  }

  async setAlias(listId: string, alias: string): Promise<ListSnapshot | null> {
    const normalizedListId = listIdSchema.parse(listId);
    const normalizedAlias = listAliasSchema.parse(alias);
    const current = this.readSnapshot();
    if (!current || current.id !== normalizedListId) {
      return null;
    }
    if (current.alias !== null) {
      return current;
    }

    const next = { ...current, alias: normalizedAlias };
    this.ctx.storage.transactionSync(() => this.writeMetadata(next));
    this.broadcast({ type: "snapshot", snapshot: next });
    return next;
  }

  async applyMutation(listId: string, mutation: ListMutation): Promise<ApplyMutationResult> {
    const normalizedListId = listIdSchema.parse(listId);
    const parsedMutation = parseListMutation(mutation);

    if (!parsedMutation.auth) {
      return { status: "unauthorized" };
    }
    const authorization = await this.env.KEWEKE_USERS.getByName(
      parsedMutation.auth.userId,
    ).authorizeMutation({
      auth: parsedMutation.auth,
      payload: listMutationSigningPayload(parsedMutation),
    });
    if (!authorization) {
      return { status: "unauthorized" };
    }
    const authorizedMutation: ListMutation = {
      ...parsedMutation,
      actor: { id: authorization.userId, username: authorization.username },
    };

    const result = await this.ctx.blockConcurrencyWhile(async (): Promise<ApplyMutationResult> => {
      const current = this.readSnapshot();
      if (!current || current.id !== normalizedListId) {
        return { status: "missing" };
      }

      const alreadyApplied = this.ctx.storage.sql
        .exec<{ revision: number }>(
          "SELECT revision FROM applied_mutations WHERE id = ?",
          parsedMutation.id,
        )
        .toArray()[0];
      if (alreadyApplied) {
        return { status: "ok", snapshot: current };
      }

      const now = new Date().toISOString();
      const applied = applyListMutationWithDiff(current, authorizedMutation, now);
      if (!applied) {
        return { status: "conflict", snapshot: current };
      }
      const next = applied.snapshot;

      const history: ItemHistoryWrite = {
        mutationId: authorizedMutation.id,
        actor: authorizedMutation.actor ?? null,
        command: authorizedMutation.command,
        appliedAt: now,
        itemIds: itemHistoryItemIds(authorizedMutation.command, current, applied.diff),
      };

      this.ctx.storage.transactionSync(() => {
        this.writeMutationDelta(next, applied.diff, history);
        this.ctx.storage.sql.exec(
          "INSERT INTO applied_mutations (id, revision) VALUES (?, ?)",
          parsedMutation.id,
          next.revision,
        );
        this.ctx.storage.sql.exec(
          "DELETE FROM applied_mutations WHERE revision < ?",
          next.revision - APPLIED_MUTATION_RETENTION,
        );
      });

      const liveMutation: LiveListMutation = {
        id: authorizedMutation.id,
        baseRevision: authorizedMutation.baseRevision,
        actor: authorizedMutation.actor,
        command: authorizedMutation.command,
      };
      this.broadcast({ type: "mutation", mutation: liveMutation, appliedAt: now });
      return { status: "ok", snapshot: next };
    });

    if (result.status === "ok") {
      await this.recordListTouched(authorization.userId, normalizedListId);
    }
    return result;
  }

  async importSnapshot(
    listId: string,
    value: ListSnapshot,
    migrationId: string,
    auth: PublishAuth,
    payload: string,
  ): Promise<ImportSnapshotResult> {
    const normalizedListId = listIdSchema.parse(listId);
    const snapshot = parseListSnapshot(value);
    if (snapshot.id !== normalizedListId) {
      throw new Error("Snapshot list identifier does not match the requested list");
    }

    const parsedAuth = publishAuthSchema.safeParse(auth);
    if (!parsedAuth.success) {
      return { status: "unauthorized" };
    }
    const authorization = await this.env.KEWEKE_USERS.getByName(
      parsedAuth.data.userId,
    ).authorizePublish({ auth: parsedAuth.data, payload });
    if (authorization.status === "unauthorized") {
      return { status: "unauthorized" };
    }

    const current = this.readSnapshot();
    const previousImport = this.ctx.storage.sql
      .exec<{ id: string }>("SELECT id FROM imports WHERE id = ?", migrationId)
      .toArray()[0];

    if (previousImport && current) {
      return { status: "already-imported", snapshot: current };
    }
    if (current) {
      return { status: "conflict", snapshot: current };
    }

    await this.recordListCreated(authorization.authorization.userId, normalizedListId);
    this.ctx.storage.transactionSync(() => {
      this.writeSnapshot(snapshot, authorization.authorization.userId);
      this.ctx.storage.sql.exec("INSERT INTO imports (id) VALUES (?)", migrationId);
    });
    this.broadcast({ type: "snapshot", snapshot });
    return { status: "imported", snapshot };
  }

  private async recordListCreated(userId: string, listId: string): Promise<void> {
    await this.env.KEWEKE_USERS.getByName(userId).recordListCreated(listId);
  }

  private async recordListTouched(userId: string, listId: string): Promise<void> {
    try {
      await this.env.KEWEKE_USERS.getByName(userId).recordListTouched(listId);
    } catch (error) {
      console.error("Keweke list touch index update failed", { error, listId, userId });
    }
  }

  private migrate(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS _sql_schema_migrations (
        id INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    const currentVersion = this.ctx.storage.sql
      .exec<{ version: number }>(
        "SELECT COALESCE(MAX(id), 0) AS version FROM _sql_schema_migrations",
      )
      .one().version;

    if (currentVersion < 1) {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS metadata (
          list_id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          revision INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS items (
          id TEXT PRIMARY KEY,
          list_id TEXT NOT NULL,
          name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit TEXT NOT NULL,
          amount TEXT NOT NULL,
          category TEXT NOT NULL,
          checked INTEGER NOT NULL,
          position INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS items_by_list_position ON items(list_id, position);
        CREATE TABLE IF NOT EXISTS applied_mutations (
          id TEXT PRIMARY KEY,
          revision INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS imports (
          id TEXT PRIMARY KEY
        );
        INSERT INTO _sql_schema_migrations (id) VALUES (1);
      `);
    }

    if (currentVersion < 2) {
      this.ctx.storage.sql.exec("ALTER TABLE metadata ADD COLUMN alias TEXT");
      this.ctx.storage.sql.exec("INSERT INTO _sql_schema_migrations (id) VALUES (2)");
    }

    if (currentVersion < 3) {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS deleted_items (
          archive_id TEXT PRIMARY KEY,
          list_id TEXT NOT NULL,
          item_id TEXT NOT NULL,
          name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit TEXT NOT NULL,
          amount TEXT NOT NULL,
          category TEXT NOT NULL,
          checked INTEGER NOT NULL,
          position INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS deleted_items_by_list_deleted_at
          ON deleted_items(list_id, deleted_at);
        INSERT INTO _sql_schema_migrations (id) VALUES (3);
      `);
    }

    if (currentVersion < 4) {
      this.ctx.storage.sql.exec(`
        ALTER TABLE items ADD COLUMN created_by_id TEXT;
        ALTER TABLE items ADD COLUMN created_by_username TEXT;
        ALTER TABLE items ADD COLUMN updated_by_id TEXT;
        ALTER TABLE items ADD COLUMN updated_by_username TEXT;
        ALTER TABLE deleted_items ADD COLUMN created_by_id TEXT;
        ALTER TABLE deleted_items ADD COLUMN created_by_username TEXT;
        ALTER TABLE deleted_items ADD COLUMN updated_by_id TEXT;
        ALTER TABLE deleted_items ADD COLUMN updated_by_username TEXT;
        ALTER TABLE deleted_items ADD COLUMN deleted_by_id TEXT;
        ALTER TABLE deleted_items ADD COLUMN deleted_by_username TEXT;
        INSERT INTO _sql_schema_migrations (id) VALUES (4);
      `);
    }

    if (currentVersion < 5) {
      this.ctx.storage.sql.exec("ALTER TABLE metadata ADD COLUMN owner_user_id TEXT");
      this.ctx.storage.sql.exec("INSERT INTO _sql_schema_migrations (id) VALUES (5)");
    }

    if (currentVersion < 6) {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS item_history (
          id TEXT PRIMARY KEY,
          list_id TEXT NOT NULL,
          mutation_id TEXT NOT NULL,
          item_id TEXT NOT NULL,
          revision INTEGER NOT NULL,
          actor_id TEXT,
          actor_username TEXT,
          command TEXT NOT NULL,
          applied_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS item_history_by_item
          ON item_history(list_id, item_id, revision DESC, id DESC);
        CREATE INDEX IF NOT EXISTS item_history_by_list_revision
          ON item_history(list_id, revision);
        INSERT INTO _sql_schema_migrations (id) VALUES (6);
      `);
    }
  }

  private readSnapshot(): ListSnapshot | null {
    const metadata = this.readMetadata();
    if (!metadata) {
      return null;
    }

    const items = this.ctx.storage.sql
      .exec<ListItemRow>(
        `SELECT id, name, quantity, unit, amount, category, checked, position, created_at, updated_at,
                created_by_id, created_by_username, updated_by_id, updated_by_username
         FROM items WHERE list_id = ? ORDER BY position ASC, id ASC`,
        metadata.list_id,
      )
      .toArray()
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        amount: item.amount,
        category: item.category,
        checked: item.checked === 1,
        position: item.position,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        createdBy: readIdentity(item.created_by_id, item.created_by_username),
        updatedBy: readIdentity(item.updated_by_id, item.updated_by_username),
      }));

    const deletedItems = this.ctx.storage.sql
      .exec<DeletedListItemRow>(
        `SELECT archive_id, item_id, name, quantity, unit, amount, category, checked, position,
                created_at, updated_at, deleted_at, created_by_id, created_by_username,
                updated_by_id, updated_by_username, deleted_by_id, deleted_by_username
         FROM deleted_items WHERE list_id = ? ORDER BY deleted_at ASC, archive_id ASC`,
        metadata.list_id,
      )
      .toArray()
      .map((item) => ({
        archiveId: item.archive_id,
        id: item.item_id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        amount: item.amount,
        category: item.category,
        checked: item.checked === 1,
        position: item.position,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        deletedAt: item.deleted_at,
        createdBy: readIdentity(item.created_by_id, item.created_by_username),
        updatedBy: readIdentity(item.updated_by_id, item.updated_by_username),
        deletedBy: readIdentity(item.deleted_by_id, item.deleted_by_username),
      }));

    return parseListSnapshot({
      schemaVersion: LIST_SCHEMA_VERSION,
      id: metadata.list_id,
      alias: metadata.alias,
      title: metadata.title,
      items,
      deletedItems,
      revision: metadata.revision,
      createdAt: metadata.created_at,
      updatedAt: metadata.updated_at,
    });
  }

  private readMetadata(): ListMetadataRow | null {
    return (
      this.ctx.storage.sql
        .exec<ListMetadataRow>(
          "SELECT list_id, alias, title, revision, created_at, updated_at, owner_user_id FROM metadata LIMIT 1",
        )
        .toArray()[0] ?? null
    );
  }

  private broadcast(message: ListLiveMessage): void {
    const encodedMessage = JSON.stringify(message);
    for (const webSocket of this.ctx.getWebSockets("list")) {
      try {
        webSocket.send(encodedMessage);
      } catch {
        webSocket.close(1011, "Live update failed");
      }
    }
  }

  private writeSnapshot(snapshot: ListSnapshot, ownerUserId?: string): void {
    this.writeMetadata(snapshot, ownerUserId);

    this.ctx.storage.sql.exec("DELETE FROM items WHERE list_id = ?", snapshot.id);
    for (const item of snapshot.items) {
      this.upsertItemRow(snapshot.id, item);
    }

    this.ctx.storage.sql.exec("DELETE FROM deleted_items WHERE list_id = ?", snapshot.id);
    for (const item of snapshot.deletedItems.slice(-MAX_DELETED_ITEMS)) {
      this.upsertDeletedItemRow(snapshot.id, item);
    }
  }

  private writeMutationDelta(
    next: ListSnapshot,
    diff: ListSnapshotDiff,
    history: ItemHistoryWrite,
  ): void {
    this.writeMetadata(next);

    for (const item of diff.upsertItems) {
      this.upsertItemRow(next.id, item);
    }
    for (const id of diff.deleteItemIds) {
      this.ctx.storage.sql.exec("DELETE FROM items WHERE id = ?", id);
    }
    for (const item of diff.upsertDeletedItems) {
      this.upsertDeletedItemRow(next.id, item);
    }
    for (const archiveId of diff.deleteArchiveIds) {
      this.ctx.storage.sql.exec("DELETE FROM deleted_items WHERE archive_id = ?", archiveId);
    }
    for (const itemId of history.itemIds) {
      this.ctx.storage.sql.exec(
        `INSERT INTO item_history
          (id, list_id, mutation_id, item_id, revision, actor_id, actor_username, command, applied_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        uuidv7(),
        next.id,
        history.mutationId,
        itemId,
        next.revision,
        history.actor?.id ?? null,
        history.actor?.username ?? null,
        JSON.stringify(history.command),
        history.appliedAt,
      );
    }
    this.ctx.storage.sql.exec(
      "DELETE FROM item_history WHERE list_id = ? AND revision < ?",
      next.id,
      next.revision - MAX_ITEM_HISTORY_REVISIONS,
    );
  }

  private writeMetadata(snapshot: ListSnapshot, ownerUserId?: string): void {
    this.ctx.storage.sql.exec(
      `INSERT INTO metadata (list_id, alias, title, revision, created_at, updated_at, owner_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(list_id) DO UPDATE SET
         alias = excluded.alias,
         title = excluded.title,
         revision = excluded.revision,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at,
         owner_user_id = COALESCE(metadata.owner_user_id, excluded.owner_user_id)`,
      snapshot.id,
      snapshot.alias,
      snapshot.title,
      snapshot.revision,
      snapshot.createdAt,
      snapshot.updatedAt,
      ownerUserId ?? null,
    );
  }

  private upsertItemRow(listId: string, item: ListItem): void {
    this.ctx.storage.sql.exec(
      `INSERT INTO items
        (id, list_id, name, quantity, unit, amount, category, checked, position, created_at, updated_at,
         created_by_id, created_by_username, updated_by_id, updated_by_username)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         quantity = excluded.quantity,
         unit = excluded.unit,
         amount = excluded.amount,
         category = excluded.category,
         checked = excluded.checked,
         position = excluded.position,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at,
         created_by_id = excluded.created_by_id,
         created_by_username = excluded.created_by_username,
         updated_by_id = excluded.updated_by_id,
         updated_by_username = excluded.updated_by_username`,
      item.id,
      listId,
      item.name,
      item.quantity,
      item.unit,
      item.amount,
      item.category,
      item.checked ? 1 : 0,
      item.position,
      item.createdAt,
      item.updatedAt,
      item.createdBy?.id ?? null,
      item.createdBy?.username ?? null,
      item.updatedBy?.id ?? null,
      item.updatedBy?.username ?? null,
    );
  }

  private upsertDeletedItemRow(listId: string, item: DeletedListItem): void {
    this.ctx.storage.sql.exec(
      `INSERT INTO deleted_items
        (archive_id, list_id, item_id, name, quantity, unit, amount, category, checked, position,
         created_at, updated_at, deleted_at, created_by_id, created_by_username,
         updated_by_id, updated_by_username, deleted_by_id, deleted_by_username)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(archive_id) DO UPDATE SET
         name = excluded.name,
         quantity = excluded.quantity,
         unit = excluded.unit,
         amount = excluded.amount,
         category = excluded.category,
         checked = excluded.checked,
         position = excluded.position,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at,
         created_by_id = excluded.created_by_id,
         created_by_username = excluded.created_by_username,
         updated_by_id = excluded.updated_by_id,
         updated_by_username = excluded.updated_by_username,
         deleted_by_id = excluded.deleted_by_id,
         deleted_by_username = excluded.deleted_by_username`,
      item.archiveId,
      listId,
      item.id,
      item.name,
      item.quantity,
      item.unit,
      item.amount,
      item.category,
      item.checked ? 1 : 0,
      item.position,
      item.createdAt,
      item.updatedAt,
      item.deletedAt,
      item.createdBy?.id ?? null,
      item.createdBy?.username ?? null,
      item.updatedBy?.id ?? null,
      item.updatedBy?.username ?? null,
      item.deletedBy?.id ?? null,
      item.deletedBy?.username ?? null,
    );
  }
}

function readIdentity(id: string | null, username: string | null): ListIdentity | null {
  if (id === null) {
    return null;
  }

  const result = listIdentitySchema.safeParse({ id, username });
  return result.success ? result.data : null;
}

function parseStoredCommand(value: string): ListCommand | null {
  try {
    const parsed = listCommandSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
