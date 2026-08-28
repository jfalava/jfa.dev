import {
  createListAlias,
  listAliasSchema,
  normalizeListAlias,
  normalizeListAliasBase,
} from "@jfa.dev/common/aliases";
import { identityIdSchema } from "@jfa.dev/common/identities";
import { listIdSchema } from "@jfa.dev/common/lists";
import { DurableObject } from "cloudflare:workers";
import * as Schema from "effect/Schema";

interface AliasRow {
  [key: string]: string;
  alias: string;
  list_id: string;
}

interface RegisteredUserRow {
  [key: string]: string;
  user_id: string;
}

interface RegisteredListRow {
  [key: string]: string;
  list_id: string;
}

export type AliasReservationResult =
  | { status: "created"; alias: string }
  | { status: "existing"; alias: string };

export type AliasClaimResult =
  | { status: "claimed"; alias: string }
  | { status: "existing"; alias: string }
  | { status: "conflict"; alias: string };

export class KewekeAliasDirectory extends DurableObject {
  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => this.migrate());
  }

  async reserveAlias(listId: string, listTitle: string): Promise<AliasReservationResult> {
    const normalizedListId = Schema.decodeUnknownSync(listIdSchema)(listId);
    const normalizedBase = normalizeListAliasBase(listTitle);
    const existing = this.ctx.storage.sql
      .exec<AliasRow>("SELECT alias, list_id FROM aliases WHERE list_id = ?", normalizedListId)
      .toArray()[0];

    if (existing) {
      return { status: "existing", alias: existing.alias };
    }

    for (let attempt = 0; attempt < 32; attempt += 1) {
      const alias = createListAlias(normalizedBase);
      try {
        this.ctx.storage.sql.exec(
          "INSERT INTO aliases (alias, list_id) VALUES (?, ?)",
          alias,
          normalizedListId,
        );
        return { status: "created", alias };
      } catch (error) {
        if (!(error instanceof Error) || !isUniqueConstraintError(error)) {
          throw error;
        }
      }
    }

    throw new Error("Could not create a unique list alias");
  }

  async getListId(alias: string): Promise<string | null> {
    const normalizedAlias = normalizeListAlias(alias);
    const row = this.ctx.storage.sql
      .exec<AliasRow>("SELECT alias, list_id FROM aliases WHERE alias = ?", normalizedAlias)
      .toArray()[0];
    return row?.list_id ?? null;
  }

  async claimAlias(listId: string, alias: string): Promise<AliasClaimResult> {
    const normalizedListId = Schema.decodeUnknownSync(listIdSchema)(listId);
    const normalizedAlias = Schema.decodeUnknownSync(listAliasSchema)(alias);
    const existingForList = this.ctx.storage.sql
      .exec<AliasRow>("SELECT alias, list_id FROM aliases WHERE list_id = ?", normalizedListId)
      .toArray()[0];
    if (existingForList) {
      return { status: "existing", alias: existingForList.alias };
    }

    const existingForAlias = this.ctx.storage.sql
      .exec<AliasRow>("SELECT alias, list_id FROM aliases WHERE alias = ?", normalizedAlias)
      .toArray()[0];
    if (existingForAlias) {
      return { status: "conflict", alias: existingForAlias.alias };
    }

    this.ctx.storage.sql.exec(
      "INSERT INTO aliases (alias, list_id) VALUES (?, ?)",
      normalizedAlias,
      normalizedListId,
    );
    return { status: "claimed", alias: normalizedAlias };
  }

  async getAlias(listId: string): Promise<string | null> {
    const normalizedListId = Schema.decodeUnknownSync(listIdSchema)(listId);
    const row = this.ctx.storage.sql
      .exec<AliasRow>("SELECT alias, list_id FROM aliases WHERE list_id = ?", normalizedListId)
      .toArray()[0];
    return row?.alias ?? null;
  }

  async releaseAlias(listId: string): Promise<void> {
    const normalizedListId = Schema.decodeUnknownSync(listIdSchema)(listId);
    this.ctx.storage.sql.exec("DELETE FROM aliases WHERE list_id = ?", normalizedListId);
  }

  async registerUser(userId: string): Promise<void> {
    const normalizedUserId = Schema.decodeUnknownSync(identityIdSchema)(userId);
    this.ctx.storage.sql.exec(
      "INSERT INTO registered_users (user_id, registered_at) VALUES (?, ?) ON CONFLICT(user_id) DO NOTHING",
      normalizedUserId,
      new Date().toISOString(),
    );
  }

  async unregisterUser(userId: string): Promise<void> {
    const normalizedUserId = Schema.decodeUnknownSync(identityIdSchema)(userId);
    this.ctx.storage.sql.exec("DELETE FROM registered_users WHERE user_id = ?", normalizedUserId);
  }

  async listUserIds(): Promise<string[]> {
    return this.ctx.storage.sql
      .exec<RegisteredUserRow>(
        "SELECT user_id FROM registered_users ORDER BY registered_at ASC, user_id ASC",
      )
      .toArray()
      .map((row) => row.user_id);
  }

  async registerList(listId: string): Promise<void> {
    const normalizedListId = Schema.decodeUnknownSync(listIdSchema)(listId);
    this.ctx.storage.sql.exec(
      "INSERT INTO registered_lists (list_id, registered_at) VALUES (?, ?) ON CONFLICT(list_id) DO NOTHING",
      normalizedListId,
      new Date().toISOString(),
    );
  }

  async unregisterList(listId: string): Promise<void> {
    const normalizedListId = Schema.decodeUnknownSync(listIdSchema)(listId);
    this.ctx.storage.sql.exec("DELETE FROM registered_lists WHERE list_id = ?", normalizedListId);
  }

  async listListIds(): Promise<string[]> {
    return this.ctx.storage.sql
      .exec<RegisteredListRow>(
        "SELECT list_id FROM registered_lists ORDER BY registered_at ASC, list_id ASC",
      )
      .toArray()
      .map((row) => row.list_id);
  }

  private migrate(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS aliases (
        alias TEXT PRIMARY KEY,
        list_id TEXT NOT NULL UNIQUE
      );
      CREATE TABLE IF NOT EXISTS registered_users (
        user_id TEXT PRIMARY KEY,
        registered_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS registered_lists (
        list_id TEXT PRIMARY KEY,
        registered_at TEXT NOT NULL
      );
    `);
  }
}

function isUniqueConstraintError(error: Error): boolean {
  return /unique constraint/i.test(error.message);
}
