import { publicKeyFingerprint } from "@jfa.dev/common/crypto";
import { identityIdSchema, publicKeySchema } from "@jfa.dev/common/identities";
import { server } from "@passwordless-id/webauthn";
import { DurableObject } from "cloudflare:workers";

const PASSKEY_SESSION_TTL_MS = 5 * 60 * 1000;

interface PasskeySessionRow {
  [key: string]: string | number | null;
  flow: string;
  challenge: string;
  user_id: string | null;
  device_id: string;
  device_public_key: string;
  expires_at: string;
}

export type PasskeySession =
  | {
      flow: "registration";
      challenge: string;
      userId: string;
      deviceId: string;
      devicePublicKey: string;
      expiresAt: string;
    }
  | {
      flow: "adoption";
      challenge: string;
      targetDeviceId: string;
      targetDevicePublicKey: string;
      expiresAt: string;
    };

export class KewekePasskeySession extends DurableObject {
  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => this.migrate());
  }

  async startRegistration(input: {
    userId: string;
    deviceId: string;
    devicePublicKey: string;
  }): Promise<PasskeySession> {
    const userId = identityIdSchema.parse(input.userId);
    const deviceId = identityIdSchema.parse(input.deviceId);
    const devicePublicKey = publicKeySchema.parse(input.devicePublicKey);
    await this.assertDeviceFingerprint(deviceId, devicePublicKey);

    const current = this.readRow();
    if (current && new Date(current.expires_at).getTime() > Date.now()) {
      if (
        current.flow === "registration" &&
        current.user_id === userId &&
        current.device_id === deviceId &&
        current.device_public_key === devicePublicKey
      ) {
        return this.toSession(current);
      }
      throw new Error("That passkey session is already active");
    }

    const session = this.writeSession({
      flow: "registration",
      challenge: server.randomChallenge(),
      userId,
      deviceId,
      devicePublicKey,
    });
    await this.ctx.storage.setAlarm(Date.parse(session.expiresAt));
    return session;
  }

  async startAdoption(input: {
    targetDeviceId: string;
    targetDevicePublicKey: string;
  }): Promise<PasskeySession> {
    const targetDeviceId = identityIdSchema.parse(input.targetDeviceId);
    const targetDevicePublicKey = publicKeySchema.parse(input.targetDevicePublicKey);
    await this.assertDeviceFingerprint(targetDeviceId, targetDevicePublicKey);

    const current = this.readRow();
    if (current && new Date(current.expires_at).getTime() > Date.now()) {
      if (
        current.flow === "adoption" &&
        current.device_id === targetDeviceId &&
        current.device_public_key === targetDevicePublicKey
      ) {
        return this.toSession(current);
      }
      throw new Error("That passkey session is already active");
    }

    const session = this.writeSession({
      flow: "adoption",
      challenge: server.randomChallenge(),
      targetDeviceId,
      targetDevicePublicKey,
    });
    await this.ctx.storage.setAlarm(Date.parse(session.expiresAt));
    return session;
  }

  async getSession(): Promise<PasskeySession | null> {
    const row = this.readRow();
    if (!row) {
      return null;
    }
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      this.ctx.storage.sql.exec("DELETE FROM passkey_session WHERE id = 1");
      await this.ctx.storage.deleteAlarm();
      return null;
    }
    return this.toSession(row);
  }

  async finish(): Promise<boolean> {
    const row = this.readRow();
    if (!row) {
      return false;
    }
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      this.ctx.storage.sql.exec("DELETE FROM passkey_session WHERE id = 1");
      await this.ctx.storage.deleteAlarm();
      return false;
    }
    this.ctx.storage.sql.exec("DELETE FROM passkey_session WHERE id = 1");
    await this.ctx.storage.deleteAlarm();
    return true;
  }

  async alarm(): Promise<void> {
    this.ctx.storage.sql.exec("DELETE FROM passkey_session WHERE id = 1");
  }

  private async assertDeviceFingerprint(deviceId: string, publicKey: string): Promise<void> {
    if ((await publicKeyFingerprint(publicKey)) !== deviceId) {
      throw new Error("Passkey device fingerprint does not match its public key");
    }
  }

  private writeSession(
    input:
      | {
          flow: "registration";
          challenge: string;
          userId: string;
          deviceId: string;
          devicePublicKey: string;
        }
      | {
          flow: "adoption";
          challenge: string;
          targetDeviceId: string;
          targetDevicePublicKey: string;
        },
  ): PasskeySession {
    const expiresAt = new Date(Date.now() + PASSKEY_SESSION_TTL_MS).toISOString();
    this.ctx.storage.sql.exec(
      `INSERT INTO passkey_session (
         id, flow, challenge, user_id, device_id, device_public_key, expires_at
       ) VALUES (1, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         flow = excluded.flow,
         challenge = excluded.challenge,
         user_id = excluded.user_id,
         device_id = excluded.device_id,
         device_public_key = excluded.device_public_key,
         expires_at = excluded.expires_at`,
      input.flow,
      input.challenge,
      input.flow === "registration" ? input.userId : null,
      input.flow === "registration" ? input.deviceId : input.targetDeviceId,
      input.flow === "registration" ? input.devicePublicKey : input.targetDevicePublicKey,
      expiresAt,
    );
    return input.flow === "registration"
      ? {
          flow: input.flow,
          challenge: input.challenge,
          userId: input.userId,
          deviceId: input.deviceId,
          devicePublicKey: input.devicePublicKey,
          expiresAt,
        }
      : {
          flow: input.flow,
          challenge: input.challenge,
          targetDeviceId: input.targetDeviceId,
          targetDevicePublicKey: input.targetDevicePublicKey,
          expiresAt,
        };
  }

  private readRow(): PasskeySessionRow | undefined {
    return this.ctx.storage.sql
      .exec<PasskeySessionRow>(
        `SELECT flow, challenge, user_id, device_id, device_public_key, expires_at
         FROM passkey_session WHERE id = 1`,
      )
      .toArray()[0];
  }

  private toSession(row: PasskeySessionRow): PasskeySession {
    if (row.flow === "registration" && row.user_id !== null) {
      return {
        flow: "registration",
        challenge: row.challenge,
        userId: row.user_id,
        deviceId: row.device_id,
        devicePublicKey: row.device_public_key,
        expiresAt: row.expires_at,
      };
    }
    if (row.flow === "adoption" && row.user_id === null) {
      return {
        flow: "adoption",
        challenge: row.challenge,
        targetDeviceId: row.device_id,
        targetDevicePublicKey: row.device_public_key,
        expiresAt: row.expires_at,
      };
    }
    throw new Error("Invalid passkey session state");
  }

  private migrate(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS passkey_session (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        flow TEXT NOT NULL,
        challenge TEXT NOT NULL,
        user_id TEXT,
        device_id TEXT NOT NULL,
        device_public_key TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
    `);
  }
}
