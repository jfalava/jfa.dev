import { publicKeyFingerprint, verifyPayload } from "@jfa.dev/common/crypto";
import {
  identityAuthSchema,
  identityIdSchema,
  passkeyCredentialIdSchema,
  passkeyCredentialSchema,
  passkeyProfileSchema,
  publishAuthSchema,
  publicKeySchema,
  userProfileSchema,
  usernameSchema,
  type PasskeyCredential,
  type PasskeyProfile,
  type DeviceProfile,
  type UserProfile,
} from "@jfa.dev/common/identities";
import { listIdSchema } from "@jfa.dev/common/lists";
import { DurableObject } from "cloudflare:workers";

interface UserRow {
  [key: string]: string | number | null;
  user_id: string;
  user_public_key: string;
  username: string;
}

interface DeviceRow {
  [key: string]: string | number | null;
  device_id: string;
  public_key: string;
  approved_at: string;
  approved_by: string | null;
  revoked_at: string | null;
}

interface PasskeyRow {
  [key: string]: string | number | null;
  credential_id: string;
  public_key: string;
  algorithm: string;
  transports: string;
  counter: number;
  synced: number;
  created_at: string;
  last_used_at: string | null;
}

interface UserListRow {
  [key: string]: string | number | null;
  list_id: string;
}

interface AccountStateRow {
  [key: string]: string | number | null;
  status: "deleting" | "deleted";
}

export type AuthorizedDevice = {
  userId: string;
  userPublicKey: string;
  username: string;
  deviceId: string;
  devicePublicKey: string;
};

export type PublishAuthorization =
  | { status: "authorized"; authorization: AuthorizedDevice }
  | { status: "unauthorized" };

export type DeviceApprovalResult =
  | { status: "approved"; profile: UserProfile }
  | { status: "unauthorized" };

export type AccountDeletionResult =
  | { status: "deleted" }
  | { status: "failed" }
  | { status: "unauthorized" };

export type PasskeyRegistrationResult =
  | { status: "registered" | "existing" }
  | { status: "unauthorized" };

export class KewekeUserDirectory extends DurableObject {
  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => this.migrate());
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    const normalizedUserId = identityIdSchema.parse(userId);
    return this.readProfile(normalizedUserId);
  }

  async getListIds(input: { auth: unknown; payload: string }): Promise<string[] | null> {
    const auth = identityAuthSchema.safeParse(input.auth);
    if (!auth.success) {
      return null;
    }

    const authorization = await this.authorizeDevice({
      auth: auth.data,
      payload: input.payload,
    });
    if (!authorization) {
      return null;
    }

    return this.ctx.storage.sql
      .exec<UserListRow>(
        "SELECT list_id FROM user_lists ORDER BY touched_at DESC, list_id ASC",
      )
      .toArray()
      .map((row) => row.list_id);
  }

  async deleteAccount(input: {
    auth: unknown;
    payload: string;
  }): Promise<AccountDeletionResult> {
    const auth = identityAuthSchema.safeParse(input.auth);
    if (!auth.success) {
      return { status: "unauthorized" };
    }

    const state = this.readAccountState();
    if (state?.status === "deleted") {
      return { status: "deleted" };
    }

    const authorization = await this.authorizeDevice({
      auth: auth.data,
      payload: input.payload,
      allowDeleting: true,
    });
    if (!authorization) {
      return { status: "unauthorized" };
    }

    if (!state) {
      this.ctx.storage.sql.exec(
        "INSERT OR IGNORE INTO account_state (id, status, updated_at) VALUES (1, 'deleting', ?)",
        new Date().toISOString(),
      );
    }

    try {
      await this.deleteCreatedLists(authorization.userId);
      this.ctx.storage.transactionSync(() => {
        this.ctx.storage.sql.exec("DELETE FROM devices");
        this.ctx.storage.sql.exec("DELETE FROM passkeys");
        this.ctx.storage.sql.exec("DELETE FROM user_profile");
        this.ctx.storage.sql.exec("DELETE FROM user_lists");
        this.ctx.storage.sql.exec(
          "UPDATE account_state SET status = 'deleted', updated_at = ? WHERE id = 1",
          new Date().toISOString(),
        );
      });
      return { status: "deleted" };
    } catch (error) {
      console.error("Keweke remote account deletion failed", {
        error,
        userId: authorization.userId,
      });
      return { status: "failed" };
    }
  }

  async recordListCreated(listId: string): Promise<void> {
    if (this.readAccountState()) {
      throw new Error("Remote user is unavailable");
    }
    const normalizedListId = listIdSchema.parse(listId);
    const now = new Date().toISOString();
    this.ctx.storage.sql.exec(
      `INSERT INTO user_lists (list_id, created_at, touched_at)
       VALUES (?, ?, ?)
       ON CONFLICT(list_id) DO UPDATE SET
         created_at = COALESCE(user_lists.created_at, excluded.created_at),
         touched_at = excluded.touched_at`,
      normalizedListId,
      now,
      now,
    );
  }

  async recordListTouched(listId: string): Promise<void> {
    const normalizedListId = listIdSchema.parse(listId);
    const now = new Date().toISOString();
    this.ctx.storage.sql.exec(
      `INSERT INTO user_lists (list_id, created_at, touched_at)
       VALUES (?, NULL, ?)
       ON CONFLICT(list_id) DO UPDATE SET touched_at = excluded.touched_at`,
      normalizedListId,
      now,
    );
  }

  async authorizePublish(input: { auth: unknown; payload: string }): Promise<PublishAuthorization> {
    const auth = publishAuthSchema.safeParse(input.auth);
    if (!auth.success) {
      return { status: "unauthorized" };
    }

    const identityMatches =
      (await publicKeyFingerprint(auth.data.userPublicKey)) === auth.data.userId &&
      (await publicKeyFingerprint(auth.data.devicePublicKey)) === auth.data.deviceId;
    if (!identityMatches) {
      return { status: "unauthorized" };
    }

    const current = await this.readProfile(auth.data.userId);
    if (!current) {
      if (this.readAccountState()) {
        return { status: "unauthorized" };
      }

      const signatureValid = await verifyPayload(
        auth.data.devicePublicKey,
        auth.data.signature,
        input.payload,
      );
      if (!signatureValid) {
        return { status: "unauthorized" };
      }

      const now = new Date().toISOString();
      this.ctx.storage.transactionSync(() => {
        this.ctx.storage.sql.exec(
          `INSERT INTO user_profile (id, user_id, user_public_key, username)
           VALUES (1, ?, ?, ?)`,
          auth.data.userId,
          auth.data.userPublicKey,
          auth.data.username,
        );
        this.ctx.storage.sql.exec(
          `INSERT INTO devices (device_id, public_key, approved_at, approved_by, revoked_at)
           VALUES (?, ?, ?, NULL, NULL)`,
          auth.data.deviceId,
          auth.data.devicePublicKey,
          now,
        );
      });

      return {
        status: "authorized",
        authorization: {
          userId: auth.data.userId,
          userPublicKey: auth.data.userPublicKey,
          username: auth.data.username,
          deviceId: auth.data.deviceId,
          devicePublicKey: auth.data.devicePublicKey,
        },
      };
    }

    if (
      current.userPublicKey !== auth.data.userPublicKey ||
      current.username !== auth.data.username
    ) {
      return { status: "unauthorized" };
    }

    if (this.readAccountState()) {
      return { status: "unauthorized" };
    }

    const authorization = await this.authorizeDevice({
      auth: auth.data,
      payload: input.payload,
    });
    return authorization ? { status: "authorized", authorization } : { status: "unauthorized" };
  }

  async authorizeMutation(input: {
    auth: unknown;
    payload: string;
  }): Promise<AuthorizedDevice | null> {
    const auth = identityAuthSchema.safeParse(input.auth);
    if (!auth.success) {
      return null;
    }
    return this.authorizeDevice({ auth: auth.data, payload: input.payload });
  }

  async updateUsername(input: {
    auth: unknown;
    username: string;
    payload: string;
  }): Promise<UserProfile | null> {
    const auth = identityAuthSchema.safeParse(input.auth);
    const username = usernameSchema.safeParse(input.username);
    if (!auth.success || !username.success) {
      return null;
    }

    const authorization = await this.authorizeDevice({
      auth: auth.data,
      payload: input.payload,
    });
    if (!authorization) {
      return null;
    }

    this.ctx.storage.sql.exec("UPDATE user_profile SET username = ? WHERE id = 1", username.data);
    return this.readProfile(auth.data.userId);
  }

  async getPasskeyCredential(input: {
    userId: string;
    credentialId: string;
  }): Promise<PasskeyCredential | null> {
    const userId = identityIdSchema.safeParse(input.userId);
    const credentialId = passkeyCredentialIdSchema.safeParse(input.credentialId);
    if (!userId.success || !credentialId.success || this.readAccountState()) {
      return null;
    }
    if (!(await this.readProfile(userId.data))) {
      return null;
    }

    const row = this.readPasskey(credentialId.data);
    return row ? this.toPasskeyCredential(row) : null;
  }

  async registerPasskey(input: {
    userId: string;
    credential: PasskeyCredential;
  }): Promise<PasskeyRegistrationResult> {
    const userId = identityIdSchema.safeParse(input.userId);
    const credential = passkeyCredentialSchema.safeParse(input.credential);
    if (!userId.success || !credential.success || this.readAccountState()) {
      return { status: "unauthorized" };
    }
    if (!(await this.readProfile(userId.data))) {
      return { status: "unauthorized" };
    }

    const existing = this.readPasskey(credential.data.id);
    if (existing) {
      const existingCredential = this.toPasskeyCredential(existing);
      return existingCredential.publicKey === credential.data.publicKey &&
        existingCredential.algorithm === credential.data.algorithm
        ? { status: "existing" }
        : { status: "unauthorized" };
    }

    this.ctx.storage.sql.exec(
      `INSERT INTO passkeys (
         credential_id, public_key, algorithm, transports, counter, synced, created_at, last_used_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
      credential.data.id,
      credential.data.publicKey,
      credential.data.algorithm,
      JSON.stringify(credential.data.transports),
      credential.data.counter,
      credential.data.synced ? 1 : 0,
      new Date().toISOString(),
    );
    return { status: "registered" };
  }

  async approveDeviceByPasskey(input: {
    userId: string;
    targetDeviceId: string;
    targetDevicePublicKey: string;
    credentialId: string;
    counter: number;
  }): Promise<DeviceApprovalResult> {
    const userId = identityIdSchema.safeParse(input.userId);
    const targetDeviceId = identityIdSchema.safeParse(input.targetDeviceId);
    const targetPublicKey = publicKeySchema.safeParse(input.targetDevicePublicKey);
    const credentialId = passkeyCredentialIdSchema.safeParse(input.credentialId);
    if (
      !userId.success ||
      !targetDeviceId.success ||
      !targetPublicKey.success ||
      !credentialId.success ||
      !Number.isSafeInteger(input.counter) ||
      input.counter < 0
    ) {
      return { status: "unauthorized" };
    }

    if ((await publicKeyFingerprint(targetPublicKey.data)) !== targetDeviceId.data) {
      return { status: "unauthorized" };
    }

    const profile = await this.readProfile(userId.data);
    const passkey = this.readPasskey(credentialId.data);
    if (!profile || this.readAccountState() || !passkey) {
      return { status: "unauthorized" };
    }

    const existing = profile.devices.find((device) => device.deviceId === targetDeviceId.data);
    if (existing?.revokedAt !== null && existing !== undefined) {
      return { status: "unauthorized" };
    }

    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec(
        `UPDATE passkeys
         SET counter = CASE WHEN counter < ? THEN ? ELSE counter END,
             last_used_at = ?
         WHERE credential_id = ?`,
        input.counter,
        input.counter,
        new Date().toISOString(),
        credentialId.data,
      );
      if (!existing) {
        this.ctx.storage.sql.exec(
          `INSERT INTO devices (device_id, public_key, approved_at, approved_by, revoked_at)
           VALUES (?, ?, ?, NULL, NULL)`,
          targetDeviceId.data,
          targetPublicKey.data,
          new Date().toISOString(),
        );
      }
    });

    const updated = await this.readProfile(userId.data);
    return updated ? { status: "approved", profile: updated } : { status: "unauthorized" };
  }

  async listPasskeys(input: { auth: unknown; payload: string }): Promise<PasskeyProfile[] | null> {
    const auth = identityAuthSchema.safeParse(input.auth);
    if (!auth.success) {
      return null;
    }
    const authorization = await this.authorizeDevice({
      auth: auth.data,
      payload: input.payload,
    });
    if (!authorization) {
      return null;
    }

    return this.ctx.storage.sql
      .exec<PasskeyRow>(
        `SELECT credential_id, public_key, algorithm, transports, counter, synced, created_at, last_used_at
         FROM passkeys ORDER BY created_at ASC, credential_id ASC`,
      )
      .toArray()
      .map((row) => this.toPasskeyProfile(row));
  }

  async deletePasskey(input: {
    auth: unknown;
    credentialId: string;
    payload: string;
  }): Promise<PasskeyProfile[] | null> {
    const auth = identityAuthSchema.safeParse(input.auth);
    const credentialId = passkeyCredentialIdSchema.safeParse(input.credentialId);
    if (!auth.success || !credentialId.success) {
      return null;
    }
    const authorization = await this.authorizeDevice({
      auth: auth.data,
      payload: input.payload,
    });
    if (!authorization) {
      return null;
    }

    this.ctx.storage.sql.exec("DELETE FROM passkeys WHERE credential_id = ?", credentialId.data);
    return this.ctx.storage.sql
      .exec<PasskeyRow>(
        `SELECT credential_id, public_key, algorithm, transports, counter, synced, created_at, last_used_at
         FROM passkeys ORDER BY created_at ASC, credential_id ASC`,
      )
      .toArray()
      .map((row) => this.toPasskeyProfile(row));
  }

  async approveDevice(input: {
    userId: string;
    approverDeviceId: string;
    targetDeviceId: string;
    targetDevicePublicKey: string;
    signature: string;
    payload: string;
  }): Promise<DeviceApprovalResult> {
    const userId = identityIdSchema.safeParse(input.userId);
    const approverDeviceId = identityIdSchema.safeParse(input.approverDeviceId);
    const targetDeviceId = identityIdSchema.safeParse(input.targetDeviceId);
    const targetPublicKey = publicKeySchema.safeParse(input.targetDevicePublicKey);
    if (
      !userId.success ||
      !approverDeviceId.success ||
      !targetDeviceId.success ||
      !targetPublicKey.success
    ) {
      return { status: "unauthorized" };
    }

    if ((await publicKeyFingerprint(targetPublicKey.data)) !== targetDeviceId.data) {
      return { status: "unauthorized" };
    }

    const profile = await this.readProfile(userId.data);
    if (this.readAccountState()) {
      return { status: "unauthorized" };
    }
    const approver = profile?.devices.find(
      (device) => device.deviceId === approverDeviceId.data && device.revokedAt === null,
    );
    if (!profile || !approver) {
      return { status: "unauthorized" };
    }

    const signatureValid = await verifyPayload(approver.publicKey, input.signature, input.payload);
    if (!signatureValid) {
      return { status: "unauthorized" };
    }

    const existing = profile.devices.find((device) => device.deviceId === targetDeviceId.data);
    if (existing?.revokedAt !== null && existing !== undefined) {
      return { status: "unauthorized" };
    }
    if (!existing) {
      this.ctx.storage.sql.exec(
        `INSERT INTO devices (device_id, public_key, approved_at, approved_by, revoked_at)
         VALUES (?, ?, ?, ?, NULL)`,
        targetDeviceId.data,
        targetPublicKey.data,
        new Date().toISOString(),
        approverDeviceId.data,
      );
    }

    const updated = await this.readProfile(userId.data);
    return updated ? { status: "approved", profile: updated } : { status: "unauthorized" };
  }

  async revokeDevice(input: {
    userId: string;
    approverDeviceId: string;
    targetDeviceId: string;
    signature: string;
    payload: string;
  }): Promise<UserProfile | null> {
    const auth = identityAuthSchema.safeParse({
      userId: input.userId,
      deviceId: input.approverDeviceId,
      signature: input.signature,
    });
    const targetDeviceId = identityIdSchema.safeParse(input.targetDeviceId);
    if (!auth.success || !targetDeviceId.success) {
      return null;
    }

    const authorization = await this.authorizeDevice({ auth: auth.data, payload: input.payload });
    if (!authorization) {
      return null;
    }
    const targetExists = (await this.readProfile(auth.data.userId))?.devices.some(
      (device) => device.deviceId === targetDeviceId.data,
    );
    if (!targetExists) {
      return null;
    }

    this.ctx.storage.sql.exec(
      "UPDATE devices SET revoked_at = COALESCE(revoked_at, ?) WHERE device_id = ?",
      new Date().toISOString(),
      targetDeviceId.data,
    );
    return this.readProfile(auth.data.userId);
  }

  private async authorizeDevice(input: {
    auth: { userId: string; deviceId: string; signature: string };
    payload: string;
    allowDeleting?: boolean;
  }): Promise<AuthorizedDevice | null> {
    const accountState = this.readAccountState();
    if (
      accountState &&
      !(input.allowDeleting && accountState.status === "deleting")
    ) {
      return null;
    }

    const profile = await this.readProfile(input.auth.userId);
    const device = profile?.devices.find(
      (candidate) => candidate.deviceId === input.auth.deviceId && candidate.revokedAt === null,
    );
    if (!profile || !device) {
      return null;
    }

    const signatureValid = await verifyPayload(
      device.publicKey,
      input.auth.signature,
      input.payload,
    );
    if (!signatureValid) {
      return null;
    }

    return {
      userId: profile.userId,
      userPublicKey: profile.userPublicKey,
      username: profile.username,
      deviceId: device.deviceId,
      devicePublicKey: device.publicKey,
    };
  }

  private async deleteCreatedLists(userId: string): Promise<void> {
    while (true) {
      const listIds = this.ctx.storage.sql
        .exec<UserListRow>(
          "SELECT list_id FROM user_lists WHERE created_at IS NOT NULL ORDER BY list_id ASC",
        )
        .toArray()
        .map((row) => row.list_id);
      if (listIds.length === 0) {
        return;
      }

      for (const listId of listIds) {
        const deletion = await this.env.KEWEKE_LISTS.getByName(listId).deleteOwnedList(userId);
        if (deletion.status === "unauthorized") {
          throw new Error(`The user does not own indexed list ${listId}`);
        }

        await this.env.KEWEKE_ALIASES.getByName("directory").releaseAlias(listId);
        this.ctx.storage.sql.exec("DELETE FROM user_lists WHERE list_id = ?", listId);
      }
    }
  }

  private readAccountState(): AccountStateRow | null {
    return (
      this.ctx.storage.sql
        .exec<AccountStateRow>("SELECT status FROM account_state WHERE id = 1")
        .toArray()[0] ?? null
    );
  }

  private async readProfile(userId: string): Promise<UserProfile | null> {
    const user = this.ctx.storage.sql
      .exec<UserRow>(
        "SELECT user_id, user_public_key, username FROM user_profile WHERE user_id = ?",
        userId,
      )
      .toArray()[0];
    if (!user) {
      return null;
    }

    const devices = this.ctx.storage.sql
      .exec<DeviceRow>(
        `SELECT device_id, public_key, approved_at, approved_by, revoked_at
         FROM devices ORDER BY approved_at ASC, device_id ASC`,
      )
      .toArray()
      .map((device): DeviceProfile => ({
        deviceId: device.device_id,
        publicKey: device.public_key,
        approvedAt: device.approved_at,
        approvedBy: device.approved_by,
        revokedAt: device.revoked_at,
      }));

    return userProfileSchema.parse({
      userId: user.user_id,
      userPublicKey: user.user_public_key,
      username: user.username,
      devices,
    });
  }

  private readPasskey(credentialId: string): PasskeyRow | undefined {
    return this.ctx.storage.sql
      .exec<PasskeyRow>(
        `SELECT credential_id, public_key, algorithm, transports, counter, synced, created_at, last_used_at
         FROM passkeys WHERE credential_id = ?`,
        credentialId,
      )
      .toArray()[0];
  }

  private toPasskeyCredential(row: PasskeyRow): PasskeyCredential {
    const transports: unknown = JSON.parse(row.transports);
    return passkeyCredentialSchema.parse({
      id: row.credential_id,
      publicKey: row.public_key,
      algorithm: row.algorithm,
      transports,
      counter: row.counter,
      synced: row.synced === 1,
    });
  }

  private toPasskeyProfile(row: PasskeyRow): PasskeyProfile {
    const transports: unknown = JSON.parse(row.transports);
    return passkeyProfileSchema.parse({
      id: row.credential_id,
      transports,
      synced: row.synced === 1,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
    });
  }

  private migrate(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        user_id TEXT NOT NULL UNIQUE,
        user_public_key TEXT NOT NULL,
        username TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS devices (
        device_id TEXT PRIMARY KEY,
        public_key TEXT NOT NULL,
        approved_at TEXT NOT NULL,
        approved_by TEXT,
        revoked_at TEXT
      );
      CREATE TABLE IF NOT EXISTS passkeys (
        credential_id TEXT PRIMARY KEY,
        public_key TEXT NOT NULL,
        algorithm TEXT NOT NULL,
        transports TEXT NOT NULL,
        counter INTEGER NOT NULL,
        synced INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        last_used_at TEXT
      );
      CREATE TABLE IF NOT EXISTS user_lists (
        list_id TEXT PRIMARY KEY,
        created_at TEXT,
        touched_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS user_lists_by_touched_at
        ON user_lists(touched_at DESC, list_id ASC);
      CREATE TABLE IF NOT EXISTS account_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        status TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }
}
