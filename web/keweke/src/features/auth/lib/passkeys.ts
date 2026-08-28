import {
  passkeyAdoptionFinishSigningPayload,
  passkeyDeleteSigningPayload,
  passkeyListSigningPayload,
  passkeyRegistrationFinishSigningPayload,
  passkeyRegistrationStartSigningPayload,
} from "@jfa.dev/common/crypto";
import {
  passkeyAuthenticationSchema,
  passkeyRegistrationSchema,
  type PasskeyProfile,
} from "@jfa.dev/common/identities";
import { client } from "@passwordless-id/webauthn";
import * as Schema from "effect/Schema";

import {
  adoptLocalIdentity,
  ensureLocalIdentity,
  signLocalPayload,
} from "@/features/auth/lib/local-identity";
import {
  completePasskeyAdoption,
  completePasskeyRegistration,
  deletePasskey,
  listPasskeys,
  startPasskeyAdoption,
  startPasskeyRegistration,
} from "@/features/auth/server/passkeys";

function requireRemoteIdentity(identity: Awaited<ReturnType<typeof ensureLocalIdentity>>) {
  if (!identity?.remoteUsername) {
    throw new Error("Set up a named user before registering a passkey");
  }
  return identity;
}

export function isPasskeyAvailable(): boolean {
  return globalThis.window !== undefined && client.isAvailable();
}

export async function registerLocalPasskey() {
  const identity = requireRemoteIdentity(await ensureLocalIdentity());
  const startPayload = passkeyRegistrationStartSigningPayload({
    userId: identity.userId,
    deviceId: identity.deviceId,
  });
  const start = await startPasskeyRegistration({
    data: {
      auth: {
        userId: identity.userId,
        deviceId: identity.deviceId,
        signature: await signLocalPayload(startPayload),
      },
    },
  });
  if (start.status !== "ready") {
    throw new Error("The current device is not authorized to register a passkey");
  }

  const registration = Schema.decodeUnknownSync(passkeyRegistrationSchema)(
    await client.register({
      challenge: start.challenge,
      user: {
        id: start.userId,
        name: start.username,
        displayName: start.username,
      },
      attestation: false,
      discoverable: "required",
      userVerification: "required",
    }),
  );
  const finishPayload = passkeyRegistrationFinishSigningPayload({
    sessionId: start.sessionId,
    userId: start.userId,
    deviceId: identity.deviceId,
    credentialId: registration.id,
  });
  return completePasskeyRegistration({
    data: {
      sessionId: start.sessionId,
      auth: {
        userId: identity.userId,
        deviceId: identity.deviceId,
        signature: await signLocalPayload(finishPayload),
      },
      registration,
    },
  });
}

export async function adoptLocalIdentityWithPasskey(): Promise<
  Awaited<ReturnType<typeof adoptLocalIdentity>>
> {
  const identity = await ensureLocalIdentity();
  if (!identity) {
    throw new Error("Local identity storage is unavailable");
  }

  const start = await startPasskeyAdoption({
    data: {
      targetDeviceId: identity.deviceId,
      targetDevicePublicKey: identity.devicePublicKey,
    },
  });
  if (start.status !== "ready") {
    throw new Error("Unable to start passkey adoption");
  }

  const authentication = Schema.decodeUnknownSync(passkeyAuthenticationSchema)(
    await client.authenticate({
      challenge: start.challenge,
      allowCredentials: [],
      userVerification: "required",
    }),
  );
  const finishPayload = passkeyAdoptionFinishSigningPayload({
    sessionId: start.sessionId,
    targetDeviceId: identity.deviceId,
    credentialId: authentication.id,
  });
  const result = await completePasskeyAdoption({
    data: {
      sessionId: start.sessionId,
      authentication,
      deviceSignature: await signLocalPayload(finishPayload),
    },
  });
  if (result.status !== "adopted") {
    throw new Error("The passkey could not adopt this device");
  }

  return adoptLocalIdentity(result.profile);
}

export async function listLocalPasskeys(): Promise<PasskeyProfile[]> {
  const identity = requireRemoteIdentity(await ensureLocalIdentity());
  const payload = passkeyListSigningPayload({
    userId: identity.userId,
    deviceId: identity.deviceId,
  });
  const result = await listPasskeys({
    data: {
      auth: {
        userId: identity.userId,
        deviceId: identity.deviceId,
        signature: await signLocalPayload(payload),
      },
    },
  });
  if (result.status !== "ok") {
    throw new Error("The current device is not authorized to list passkeys");
  }
  return result.passkeys;
}

export async function deleteLocalPasskey(credentialId: string): Promise<PasskeyProfile[]> {
  const identity = requireRemoteIdentity(await ensureLocalIdentity());
  const payload = passkeyDeleteSigningPayload({
    userId: identity.userId,
    deviceId: identity.deviceId,
    credentialId,
  });
  const result = await deletePasskey({
    data: {
      auth: {
        userId: identity.userId,
        deviceId: identity.deviceId,
        signature: await signLocalPayload(payload),
      },
      credentialId,
    },
  });
  if (result.status !== "deleted") {
    throw new Error("The current device is not authorized to delete passkeys");
  }
  return result.passkeys;
}

export type { PasskeyProfile };
