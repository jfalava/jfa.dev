import { publicKeyFingerprint, verifyPayload } from "@jfa.dev/common/crypto";
import {
  identityAuthSchema,
  identityIdSchema,
  publishAuthSchema,
  publicKeySchema,
  userProfileSchema,
  usernameSchema,
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

interface UserListRow {
  [key: string]: string | number | null;
  list_id: string;
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

  async recordListCreated(listId: string): Promise<void> {
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
  }): Promise<AuthorizedDevice | null> {
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
      CREATE TABLE IF NOT EXISTS user_lists (
        list_id TEXT PRIMARY KEY,
        created_at TEXT,
        touched_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS user_lists_by_touched_at
        ON user_lists(touched_at DESC, list_id ASC);
    `);
  }
}
