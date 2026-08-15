import {
  identityIdSchema,
  pairingCodeSchema,
  publicKeySchema,
  userProfileSchema,
  type UserProfile,
} from "@jfa.dev/common/identities";
import { publicKeyFingerprint, sha256Base64Url } from "@jfa.dev/common/crypto";
import { DurableObject } from "cloudflare:workers";

interface PairingRow {
  [key: string]: string | number | null;
  code_hash: string;
  target_device_id: string;
  target_device_public_key: string;
  expires_at: string;
  status: string;
  user_id: string | null;
}

export type PairingStatus =
  | {
      status: "missing" | "expired";
      code: string;
    }
  | {
      status: "pending";
      code: string;
      targetDeviceId: string;
      targetDevicePublicKey: string;
      expiresAt: string;
    }
  | {
      status: "approved";
      code: string;
      targetDeviceId: string;
      targetDevicePublicKey: string;
      expiresAt: string;
      profile: UserProfile;
    };

export class KewekePairingSession extends DurableObject {
  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => this.migrate());
  }

  async start(input: {
    code: string;
    targetDeviceId: string;
    targetDevicePublicKey: string;
  }): Promise<PairingStatus> {
    const code = pairingCodeSchema.parse(input.code);
    const targetDeviceId = identityIdSchema.parse(input.targetDeviceId);
    const targetDevicePublicKey = publicKeySchema.parse(input.targetDevicePublicKey);
    if ((await publicKeyFingerprint(targetDevicePublicKey)) !== targetDeviceId) {
      throw new Error("Pairing device fingerprint does not match its public key");
    }

    const current = this.readRow();
    if (current?.status === "approved") {
      return this.toStatus(code, current);
    }
    if (current && new Date(current.expires_at).getTime() > Date.now()) {
      if (
        current.target_device_id === targetDeviceId &&
        current.target_device_public_key === targetDevicePublicKey
      ) {
        return this.toStatus(code, current);
      }
      throw new Error("That pairing code is already active");
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const codeHash = await sha256Base64Url(code);
    this.ctx.storage.sql.exec(
      `INSERT INTO pairing (id, code_hash, target_device_id, target_device_public_key, expires_at, status, user_id)
       VALUES (1, ?, ?, ?, ?, 'pending', NULL)
       ON CONFLICT(id) DO UPDATE SET
         code_hash = excluded.code_hash,
         target_device_id = excluded.target_device_id,
         target_device_public_key = excluded.target_device_public_key,
         expires_at = excluded.expires_at,
         status = 'pending',
         user_id = NULL`,
      codeHash,
      targetDeviceId,
      targetDevicePublicKey,
      expiresAt,
    );
    return {
      status: "pending",
      code,
      targetDeviceId,
      targetDevicePublicKey,
      expiresAt,
    };
  }

  async getStatus(codeValue: string): Promise<PairingStatus> {
    const code = pairingCodeSchema.parse(codeValue);
    const row = this.readRow();
    if (!row || (await sha256Base64Url(code)) !== row.code_hash) {
      return { status: "missing", code };
    }
    if (row.status === "pending" && new Date(row.expires_at).getTime() <= Date.now()) {
      this.ctx.storage.sql.exec("UPDATE pairing SET status = 'expired' WHERE id = 1");
      return { status: "expired", code };
    }
    if (row.status === "expired") {
      return { status: "expired", code };
    }
    return this.toStatus(code, row);
  }

  async approve(input: {
    code: string;
    userId: string;
    approverDeviceId: string;
    targetDeviceId: string;
    targetDevicePublicKey: string;
    signature: string;
    payload: string;
  }): Promise<PairingStatus> {
    const code = pairingCodeSchema.parse(input.code);
    const row = this.readRow();
    if (!row || (await sha256Base64Url(code)) !== row.code_hash) {
      return { status: "missing", code };
    }
    if (row.status === "approved") {
      return this.toStatus(code, row);
    }
    if (row.status !== "pending" || new Date(row.expires_at).getTime() <= Date.now()) {
      this.ctx.storage.sql.exec("UPDATE pairing SET status = 'expired' WHERE id = 1");
      return { status: "expired", code };
    }
    if (
      row.target_device_id !== input.targetDeviceId ||
      row.target_device_public_key !== input.targetDevicePublicKey
    ) {
      return { status: "missing", code };
    }

    const approval = await this.env.KEWEKE_USERS.getByName(input.userId).approveDevice({
      userId: input.userId,
      approverDeviceId: input.approverDeviceId,
      targetDeviceId: input.targetDeviceId,
      targetDevicePublicKey: input.targetDevicePublicKey,
      signature: input.signature,
      payload: input.payload,
    });
    if (approval.status === "unauthorized") {
      return { status: "missing", code };
    }

    this.ctx.storage.sql.exec(
      "UPDATE pairing SET status = 'approved', user_id = ? WHERE id = 1",
      input.userId,
    );
    return this.toStatus(code, {
      ...row,
      status: "approved",
      user_id: input.userId,
    });
  }

  private async profile(userId: string): Promise<UserProfile | null> {
    const profile = await this.env.KEWEKE_USERS.getByName(userId).getProfile(userId);
    return profile ? userProfileSchema.parse(profile) : null;
  }

  private async toApprovedStatus(code: string, row: PairingRow): Promise<PairingStatus> {
    if (!row.user_id) {
      return { status: "missing", code };
    }
    const profile = await this.profile(row.user_id);
    if (!profile) {
      return { status: "missing", code };
    }
    return {
      status: "approved",
      code,
      targetDeviceId: row.target_device_id,
      targetDevicePublicKey: row.target_device_public_key,
      expiresAt: row.expires_at,
      profile,
    };
  }

  private async toStatus(code: string, row: PairingRow): Promise<PairingStatus> {
    if (row.status === "approved") {
      return this.toApprovedStatus(code, row);
    }
    return {
      status: "pending",
      code,
      targetDeviceId: row.target_device_id,
      targetDevicePublicKey: row.target_device_public_key,
      expiresAt: row.expires_at,
    };
  }

  private readRow(): PairingRow | undefined {
    return this.ctx.storage.sql
      .exec<PairingRow>(
        `SELECT code_hash, target_device_id, target_device_public_key, expires_at, status, user_id
         FROM pairing WHERE id = 1`,
      )
      .toArray()[0];
  }

  private migrate(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS pairing (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        code_hash TEXT NOT NULL,
        target_device_id TEXT NOT NULL,
        target_device_public_key TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        status TEXT NOT NULL,
        user_id TEXT
      );
    `);
  }
}
