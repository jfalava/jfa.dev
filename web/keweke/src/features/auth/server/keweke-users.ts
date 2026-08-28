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
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";

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
  created_at: string | null;
}

export type UserListIndexEntry = {
  listId: string;
  role: "owner" | "collaborator";
};

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

export type RemoteUserCreationResult =
  | { status: "created" | "existing"; profile: UserProfile }
  | { status: "conflict" | "unauthorized" };

export type DeviceApprovalResult =
  | { status: "approved"; profile: UserProfile }
  | { status: "unauthorized" };

export type AccountDeletionResult =
  | { status: "deleted" }
  | { status: "failed" }
  | { status: "unauthorized" };

export type RemoteListRemovalResult =
  | { status: "deleted" }
  | { status: "forgotten" }
  | { status: "missing" }
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
    const normalizedUserId = Schema.decodeUnknownSync(identityIdSchema)(userId);
    return this.readProfile(normalizedUserId);
  }

  async getListIds(input: { auth: unknown; payload: string }): Promise<string[] | null> {
    const index = await this.getListIndex(input);
    return index?.map((entry) => entry.listId) ?? null;
  }

  async getListIndex(input: {
    auth: unknown;
    payload: string;
  }): Promise<UserListIndexEntry[] | null> {
    const auth = Schema.decodeUnknownResult(identityAuthSchema)(input.auth);
    if (Result.isFailure(auth)) {
      return null;
    }

    const authorization = await this.authorizeDevice({
      auth: auth.success,
      payload: input.payload,
    });
    if (!authorization) {
      return null;
    }

    return this.ctx.storage.sql
      .exec<UserListRow>(
        "SELECT list_id, created_at FROM user_lists ORDER BY touched_at DESC, list_id ASC",
      )
      .toArray()
      .map((row) => ({
        listId: row.list_id,
        role: row.created_at === null ? "collaborator" : "owner",
      }));
  }

  async removeList(input: {
    auth: unknown;
    listId: string;
    payload: string;
  }): Promise<RemoteListRemovalResult> {
    const auth = Schema.decodeUnknownResult(identityAuthSchema)(input.auth);
    const listId = Schema.decodeUnknownResult(listIdSchema)(input.listId);
    if (Result.isFailure(auth) || Result.isFailure(listId)) {
      return { status: "unauthorized" };
    }

    const authorization = await this.authorizeDevice({
      auth: auth.success,
      payload: input.payload,
    });
    if (!authorization) {
      return { status: "unauthorized" };
    }

    const indexedList = this.ctx.storage.sql
      .exec<UserListRow>(
        "SELECT list_id, created_at FROM user_lists WHERE list_id = ?",
        listId.success,
      )
      .toArray()[0];
    if (!indexedList) {
      return { status: "missing" };
    }

    if (indexedList.created_at === null) {
      this.ctx.storage.sql.exec("DELETE FROM user_lists WHERE list_id = ?", listId.success);
      return { status: "forgotten" };
    }

    const deletion = await this.env.KEWEKE_LISTS.getByName(listId.success).deleteOwnedList(
      authorization.userId,
    );
    if (deletion.status === "unauthorized") {
      return { status: "unauthorized" };
    }

    await this.env.KEWEKE_ALIASES.getByName("directory").releaseAlias(listId.success);
    this.ctx.storage.sql.exec("DELETE FROM user_lists WHERE list_id = ?", listId.success);
    return { status: deletion.status };
  }

  async deleteAccount(input: { auth: unknown; payload: string }): Promise<AccountDeletionResult> {
    const auth = Schema.decodeUnknownResult(identityAuthSchema)(input.auth);
    if (Result.isFailure(auth)) {
      return { status: "unauthorized" };
    }

    const state = this.readAccountState();
    if (state?.status === "deleted") {
      return { status: "deleted" };
    }

    const authorization = await this.authorizeDevice({
      auth: auth.success,
      payload: input.payload,
      allowDeleting: true,
    });
    if (!authorization) {
      return { status: "unauthorized" };
    }

    return this.deleteAccountData(authorization.userId);
  }

  async deleteAccountAsAdmin(userId: string): Promise<{ status: "deleted" | "failed" }> {
    const normalizedUserId = Schema.decodeUnknownSync(identityIdSchema)(userId);
    return this.deleteAccountData(normalizedUserId);
  }

  async removeListAsAdmin(listId: string): Promise<void> {
    const normalizedListId = Schema.decodeUnknownSync(listIdSchema)(listId);
    this.ctx.storage.sql.exec("DELETE FROM user_lists WHERE list_id = ?", normalizedListId);
  }

  private async deleteAccountData(userId: string): Promise<{ status: "deleted" | "failed" }> {
    const state = this.readAccountState();
    if (state?.status === "deleted") {
      return { status: "deleted" };
    }

    if (!state) {
      this.ctx.storage.sql.exec(
        "INSERT OR IGNORE INTO account_state (id, status, updated_at) VALUES (1, 'deleting', ?)",
        new Date().toISOString(),
      );
    }

    try {
      await this.deleteCreatedLists(userId);
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
      await this.unregisterFromDirectory(userId);
      return { status: "deleted" };
    } catch (error) {
      console.error("Keweke remote account deletion failed", {
        error,
        userId,
      });
      return { status: "failed" };
    }
  }

  async recordListCreated(listId: string): Promise<void> {
    if (this.readAccountState()) {
      throw new Error("Remote user is unavailable");
    }
    const normalizedListId = Schema.decodeUnknownSync(listIdSchema)(listId);
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
    const normalizedListId = Schema.decodeUnknownSync(listIdSchema)(listId);
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
    const auth = Schema.decodeUnknownResult(publishAuthSchema)(input.auth);
    if (Result.isFailure(auth)) {
      return { status: "unauthorized" };
    }

    const identityMatches =
      (await publicKeyFingerprint(auth.success.userPublicKey)) === auth.success.userId &&
      (await publicKeyFingerprint(auth.success.devicePublicKey)) === auth.success.deviceId;
    if (!identityMatches) {
      return { status: "unauthorized" };
    }

    const current = await this.readProfile(auth.success.userId);
    if (!current) {
      const creation = await this.createUser(input);
      if (!("profile" in creation)) {
        return { status: "unauthorized" };
      }

      const device = creation.profile.devices.find(
        (candidate) => candidate.deviceId === auth.success.deviceId,
      );
      if (!device) {
        return { status: "unauthorized" };
      }

      return {
        status: "authorized",
        authorization: {
          userId: creation.profile.userId,
          userPublicKey: creation.profile.userPublicKey,
          username: creation.profile.username,
          deviceId: device.deviceId,
          devicePublicKey: device.publicKey,
        },
      };
    }

    if (
      current.userPublicKey !== auth.success.userPublicKey ||
      current.username !== auth.success.username
    ) {
      return { status: "unauthorized" };
    }

    if (this.readAccountState()) {
      return { status: "unauthorized" };
    }

    const authorization = await this.authorizeDevice({
      auth: auth.success,
      payload: input.payload,
    });
    return authorization ? { status: "authorized", authorization } : { status: "unauthorized" };
  }

  async createUser(input: { auth: unknown; payload: string }): Promise<RemoteUserCreationResult> {
    const auth = Schema.decodeUnknownResult(publishAuthSchema)(input.auth);
    if (Result.isFailure(auth)) {
      return { status: "unauthorized" };
    }

    const identityMatches =
      (await publicKeyFingerprint(auth.success.userPublicKey)) === auth.success.userId &&
      (await publicKeyFingerprint(auth.success.devicePublicKey)) === auth.success.deviceId;
    if (!identityMatches || this.readAccountState()) {
      return { status: "unauthorized" };
    }

    const current = await this.readProfile(auth.success.userId);
    if (current) {
      if (
        current.userPublicKey !== auth.success.userPublicKey ||
        current.username !== auth.success.username
      ) {
        return { status: "conflict" };
      }

      const device = current.devices.find(
        (candidate) =>
          candidate.deviceId === auth.success.deviceId &&
          candidate.publicKey === auth.success.devicePublicKey &&
          candidate.revokedAt === null,
      );
      if (
        !device ||
        !(await verifyPayload(device.publicKey, auth.success.signature, input.payload))
      ) {
        return { status: "unauthorized" };
      }
      await this.registerWithDirectory(auth.success.userId);
      return { status: "existing", profile: current };
    }

    const signatureValid = await verifyPayload(
      auth.success.devicePublicKey,
      auth.success.signature,
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
        auth.success.userId,
        auth.success.userPublicKey,
        auth.success.username,
      );
      this.ctx.storage.sql.exec(
        `INSERT INTO devices (device_id, public_key, approved_at, approved_by, revoked_at)
         VALUES (?, ?, ?, NULL, NULL)`,
        auth.success.deviceId,
        auth.success.devicePublicKey,
        now,
      );
    });

    const profile = await this.readProfile(auth.success.userId);
    if (profile) {
      await this.registerWithDirectory(auth.success.userId);
    }
    return profile ? { status: "created", profile } : { status: "unauthorized" };
  }

  async authorizeMutation(input: {
    auth: unknown;
    payload: string;
  }): Promise<AuthorizedDevice | null> {
    const auth = Schema.decodeUnknownResult(identityAuthSchema)(input.auth);
    if (Result.isFailure(auth)) {
      return null;
    }
    return this.authorizeDevice({ auth: auth.success, payload: input.payload });
  }

  async updateUsername(input: {
    auth: unknown;
    username: string;
    payload: string;
  }): Promise<UserProfile | null> {
    const auth = Schema.decodeUnknownResult(identityAuthSchema)(input.auth);
    const username = Schema.decodeUnknownResult(usernameSchema)(input.username);
    if (Result.isFailure(auth) || Result.isFailure(username)) {
      return null;
    }

    const authorization = await this.authorizeDevice({
      auth: auth.success,
      payload: input.payload,
    });
    if (!authorization) {
      return null;
    }

    this.ctx.storage.sql.exec(
      "UPDATE user_profile SET username = ? WHERE id = 1",
      username.success,
    );
    return this.readProfile(auth.success.userId);
  }

  async getPasskeyCredential(input: {
    userId: string;
    credentialId: string;
  }): Promise<PasskeyCredential | null> {
    const userId = Schema.decodeUnknownResult(identityIdSchema)(input.userId);
    const credentialId = Schema.decodeUnknownResult(passkeyCredentialIdSchema)(input.credentialId);
    if (Result.isFailure(userId) || Result.isFailure(credentialId) || this.readAccountState()) {
      return null;
    }
    if (!(await this.readProfile(userId.success))) {
      return null;
    }

    const row = this.readPasskey(credentialId.success);
    return row ? this.toPasskeyCredential(row) : null;
  }

  async registerPasskey(input: {
    userId: string;
    credential: PasskeyCredential;
  }): Promise<PasskeyRegistrationResult> {
    const userId = Schema.decodeUnknownResult(identityIdSchema)(input.userId);
    const credential = Schema.decodeUnknownResult(passkeyCredentialSchema)(input.credential);
    if (Result.isFailure(userId) || Result.isFailure(credential) || this.readAccountState()) {
      return { status: "unauthorized" };
    }
    if (!(await this.readProfile(userId.success))) {
      return { status: "unauthorized" };
    }

    const existing = this.readPasskey(credential.success.id);
    if (existing) {
      const existingCredential = this.toPasskeyCredential(existing);
      return existingCredential.publicKey === credential.success.publicKey &&
        existingCredential.algorithm === credential.success.algorithm
        ? { status: "existing" }
        : { status: "unauthorized" };
    }

    this.ctx.storage.sql.exec(
      `INSERT INTO passkeys (
         credential_id, public_key, algorithm, transports, counter, synced, created_at, last_used_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
      credential.success.id,
      credential.success.publicKey,
      credential.success.algorithm,
      JSON.stringify(credential.success.transports),
      credential.success.counter,
      credential.success.synced ? 1 : 0,
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
    const userId = Schema.decodeUnknownResult(identityIdSchema)(input.userId);
    const targetDeviceId = Schema.decodeUnknownResult(identityIdSchema)(input.targetDeviceId);
    const targetPublicKey = Schema.decodeUnknownResult(publicKeySchema)(
      input.targetDevicePublicKey,
    );
    const credentialId = Schema.decodeUnknownResult(passkeyCredentialIdSchema)(input.credentialId);
    if (
      Result.isFailure(userId) ||
      Result.isFailure(targetDeviceId) ||
      Result.isFailure(targetPublicKey) ||
      Result.isFailure(credentialId) ||
      !Number.isSafeInteger(input.counter) ||
      input.counter < 0
    ) {
      return { status: "unauthorized" };
    }

    if ((await publicKeyFingerprint(targetPublicKey.success)) !== targetDeviceId.success) {
      return { status: "unauthorized" };
    }

    const profile = await this.readProfile(userId.success);
    const passkey = this.readPasskey(credentialId.success);
    if (!profile || this.readAccountState() || !passkey) {
      return { status: "unauthorized" };
    }

    const existing = profile.devices.find((device) => device.deviceId === targetDeviceId.success);
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
        credentialId.success,
      );
      if (!existing) {
        this.ctx.storage.sql.exec(
          `INSERT INTO devices (device_id, public_key, approved_at, approved_by, revoked_at)
           VALUES (?, ?, ?, NULL, NULL)`,
          targetDeviceId.success,
          targetPublicKey.success,
          new Date().toISOString(),
        );
      }
    });

    const updated = await this.readProfile(userId.success);
    return updated ? { status: "approved", profile: updated } : { status: "unauthorized" };
  }

  async listPasskeys(input: { auth: unknown; payload: string }): Promise<PasskeyProfile[] | null> {
    const auth = Schema.decodeUnknownResult(identityAuthSchema)(input.auth);
    if (Result.isFailure(auth)) {
      return null;
    }
    const authorization = await this.authorizeDevice({
      auth: auth.success,
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
    const auth = Schema.decodeUnknownResult(identityAuthSchema)(input.auth);
    const credentialId = Schema.decodeUnknownResult(passkeyCredentialIdSchema)(input.credentialId);
    if (Result.isFailure(auth) || Result.isFailure(credentialId)) {
      return null;
    }
    const authorization = await this.authorizeDevice({
      auth: auth.success,
      payload: input.payload,
    });
    if (!authorization) {
      return null;
    }

    this.ctx.storage.sql.exec("DELETE FROM passkeys WHERE credential_id = ?", credentialId.success);
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
    const userId = Schema.decodeUnknownResult(identityIdSchema)(input.userId);
    const approverDeviceId = Schema.decodeUnknownResult(identityIdSchema)(input.approverDeviceId);
    const targetDeviceId = Schema.decodeUnknownResult(identityIdSchema)(input.targetDeviceId);
    const targetPublicKey = Schema.decodeUnknownResult(publicKeySchema)(
      input.targetDevicePublicKey,
    );
    if (
      Result.isFailure(userId) ||
      Result.isFailure(approverDeviceId) ||
      Result.isFailure(targetDeviceId) ||
      Result.isFailure(targetPublicKey)
    ) {
      return { status: "unauthorized" };
    }

    if ((await publicKeyFingerprint(targetPublicKey.success)) !== targetDeviceId.success) {
      return { status: "unauthorized" };
    }

    const profile = await this.readProfile(userId.success);
    if (this.readAccountState()) {
      return { status: "unauthorized" };
    }
    const approver = profile?.devices.find(
      (device) => device.deviceId === approverDeviceId.success && device.revokedAt === null,
    );
    if (!profile || !approver) {
      return { status: "unauthorized" };
    }

    const signatureValid = await verifyPayload(approver.publicKey, input.signature, input.payload);
    if (!signatureValid) {
      return { status: "unauthorized" };
    }

    const existing = profile.devices.find((device) => device.deviceId === targetDeviceId.success);
    if (existing?.revokedAt !== null && existing !== undefined) {
      return { status: "unauthorized" };
    }
    if (!existing) {
      this.ctx.storage.sql.exec(
        `INSERT INTO devices (device_id, public_key, approved_at, approved_by, revoked_at)
         VALUES (?, ?, ?, ?, NULL)`,
        targetDeviceId.success,
        targetPublicKey.success,
        new Date().toISOString(),
        approverDeviceId.success,
      );
    }

    const updated = await this.readProfile(userId.success);
    return updated ? { status: "approved", profile: updated } : { status: "unauthorized" };
  }

  async revokeDevice(input: {
    userId: string;
    approverDeviceId: string;
    targetDeviceId: string;
    signature: string;
    payload: string;
  }): Promise<UserProfile | null> {
    const auth = Schema.decodeUnknownResult(identityAuthSchema)({
      userId: input.userId,
      deviceId: input.approverDeviceId,
      signature: input.signature,
    });
    const targetDeviceId = Schema.decodeUnknownResult(identityIdSchema)(input.targetDeviceId);
    if (Result.isFailure(auth) || Result.isFailure(targetDeviceId)) {
      return null;
    }

    const authorization = await this.authorizeDevice({
      auth: auth.success,
      payload: input.payload,
    });
    if (!authorization) {
      return null;
    }
    const targetExists = (await this.readProfile(auth.success.userId))?.devices.some(
      (device) => device.deviceId === targetDeviceId.success,
    );
    if (!targetExists) {
      return null;
    }

    this.ctx.storage.sql.exec(
      "UPDATE devices SET revoked_at = COALESCE(revoked_at, ?) WHERE device_id = ?",
      new Date().toISOString(),
      targetDeviceId.success,
    );
    return this.readProfile(auth.success.userId);
  }

  async forgetDevice(input: {
    userId: string;
    approverDeviceId: string;
    targetDeviceId: string;
    signature: string;
    payload: string;
  }): Promise<UserProfile | null> {
    const auth = Schema.decodeUnknownResult(identityAuthSchema)({
      userId: input.userId,
      deviceId: input.approverDeviceId,
      signature: input.signature,
    });
    const targetDeviceId = Schema.decodeUnknownResult(identityIdSchema)(input.targetDeviceId);
    if (Result.isFailure(auth) || Result.isFailure(targetDeviceId)) {
      return null;
    }

    const authorization = await this.authorizeDevice({
      auth: auth.success,
      payload: input.payload,
    });
    if (!authorization) {
      return null;
    }
    const target = (await this.readProfile(auth.success.userId))?.devices.find(
      (device) => device.deviceId === targetDeviceId.success,
    );
    if (!target || target.revokedAt === null) {
      return null;
    }

    this.ctx.storage.sql.exec("DELETE FROM devices WHERE device_id = ?", targetDeviceId.success);
    return this.readProfile(auth.success.userId);
  }

  private async authorizeDevice(input: {
    auth: { userId: string; deviceId: string; signature: string };
    payload: string;
    allowDeleting?: boolean;
  }): Promise<AuthorizedDevice | null> {
    const accountState = this.readAccountState();
    if (accountState && !(input.allowDeleting && accountState.status === "deleting")) {
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

  private async registerWithDirectory(userId: string): Promise<void> {
    try {
      await this.env.KEWEKE_ALIASES.getByName("directory").registerUser(userId);
    } catch (error) {
      console.error("Keweke directory user registration failed", { error, userId });
    }
  }

  private async unregisterFromDirectory(userId: string): Promise<void> {
    try {
      await this.env.KEWEKE_ALIASES.getByName("directory").unregisterUser(userId);
    } catch (error) {
      console.error("Keweke directory user removal failed", { error, userId });
    }
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

    return Schema.decodeUnknownSync(userProfileSchema)({
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
    return Schema.decodeUnknownSync(passkeyCredentialSchema)({
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
    return Schema.decodeUnknownSync(passkeyProfileSchema)({
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
