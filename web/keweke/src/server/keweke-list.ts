import { listAliasSchema } from "@jfa.dev/common/aliases";
import { listMutationSigningPayload } from "@jfa.dev/common/crypto";
import {
  listIdentitySchema,
  publishAuthSchema,
  type ListIdentity,
} from "@jfa.dev/common/identities";
import {
  LIST_SCHEMA_VERSION,
  applyListMutation,
  listIdSchema,
  parseListMutation,
  parseListSnapshot,
  type ApplyMutationResult,
  type ImportSnapshotResult,
  type ListMutation,
  type ListSnapshot,
} from "@jfa.dev/common/lists";
import { DurableObject } from "cloudflare:workers";

interface ListMetadataRow {
  [key: string]: string | number | null;
  list_id: string;
  alias: string | null;
  title: string;
  revision: number;
  created_at: string;
  updated_at: string;
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

export class KewekeList extends DurableObject {
  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => this.migrate());
  }

  async getSnapshot(listId: string): Promise<ListSnapshot | null> {
    const normalizedListId = listIdSchema.parse(listId);
    const snapshot = this.readSnapshot();
    if (!snapshot || snapshot.id !== normalizedListId) {
      return null;
    }
    return snapshot;
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
    this.ctx.storage.transactionSync(() => this.writeSnapshot(next));
    return next;
  }

  async applyMutation(listId: string, mutation: ListMutation): Promise<ApplyMutationResult> {
    const normalizedListId = listIdSchema.parse(listId);
    const parsedMutation = parseListMutation(mutation);
    const current = this.readSnapshot();

    if (!current || current.id !== normalizedListId) {
      return { status: "missing" };
    }

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

    const alreadyApplied = this.ctx.storage.sql
      .exec<{ revision: number }>(
        "SELECT revision FROM applied_mutations WHERE id = ?",
        parsedMutation.id,
      )
      .toArray()[0];
    if (alreadyApplied) {
      await this.recordListTouched(parsedMutation.auth.userId, normalizedListId);
      return { status: "ok", snapshot: current };
    }

    const next = applyListMutation(current, authorizedMutation);
    if (!next) {
      return { status: "conflict", snapshot: current };
    }

    this.ctx.storage.transactionSync(() => {
      this.writeSnapshot(next);
      this.ctx.storage.sql.exec(
        "INSERT INTO applied_mutations (id, revision) VALUES (?, ?)",
        parsedMutation.id,
        next.revision,
      );
    });
    await this.recordListTouched(authorization.userId, normalizedListId);
    return { status: "ok", snapshot: next };
  }

  async importSnapshot(
    listId: string,
    value: ListSnapshot,
    migrationId: string,
    auth: unknown,
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

    this.ctx.storage.transactionSync(() => {
      this.writeSnapshot(snapshot);
      this.ctx.storage.sql.exec("INSERT INTO imports (id) VALUES (?)", migrationId);
    });
    await this.recordListCreated(authorization.authorization.userId, normalizedListId);
    return { status: "imported", snapshot };
  }

  private async recordListCreated(userId: string, listId: string): Promise<void> {
    try {
      await this.env.KEWEKE_USERS.getByName(userId).recordListCreated(listId);
    } catch (error) {
      console.error("Keweke list creation index update failed", { error, listId, userId });
    }
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
  }

  private readSnapshot(): ListSnapshot | null {
    const metadata = this.ctx.storage.sql
      .exec<ListMetadataRow>(
        "SELECT list_id, alias, title, revision, created_at, updated_at FROM metadata LIMIT 1",
      )
      .toArray()[0];
    if (!metadata) {
      return null;
    }

    const items = this.ctx.storage.sql
      .exec<ListItemRow>(
        `SELECT id, name, quantity, unit, amount, category, checked, position, created_at, updated_at,
                created_by_id, created_by_username, updated_by_id, updated_by_username
         FROM items WHERE list_id = ? ORDER BY position ASC`,
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

  private writeSnapshot(snapshot: ListSnapshot): void {
    this.ctx.storage.sql.exec(
      `INSERT INTO metadata (list_id, alias, title, revision, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(list_id) DO UPDATE SET
         alias = excluded.alias,
         title = excluded.title,
         revision = excluded.revision,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at`,
      snapshot.id,
      snapshot.alias,
      snapshot.title,
      snapshot.revision,
      snapshot.createdAt,
      snapshot.updatedAt,
    );
    this.ctx.storage.sql.exec("DELETE FROM items WHERE list_id = ?", snapshot.id);

    for (const item of snapshot.items) {
      this.ctx.storage.sql.exec(
        `INSERT INTO items
          (id, list_id, name, quantity, unit, amount, category, checked, position, created_at, updated_at,
           created_by_id, created_by_username, updated_by_id, updated_by_username)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.id,
        snapshot.id,
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

    this.ctx.storage.sql.exec("DELETE FROM deleted_items WHERE list_id = ?", snapshot.id);
    for (const item of snapshot.deletedItems) {
      this.ctx.storage.sql.exec(
        `INSERT INTO deleted_items
          (archive_id, list_id, item_id, name, quantity, unit, amount, category, checked, position,
           created_at, updated_at, deleted_at, created_by_id, created_by_username,
           updated_by_id, updated_by_username, deleted_by_id, deleted_by_username)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.archiveId,
        snapshot.id,
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
}

function readIdentity(id: string | null, username: string | null): ListIdentity | null {
  if (id === null) {
    return null;
  }

  const result = listIdentitySchema.safeParse({ id, username });
  return result.success ? result.data : null;
}
