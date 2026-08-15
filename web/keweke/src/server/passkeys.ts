import {
  base64UrlDecode,
  passkeyAdoptionFinishSigningPayload,
  passkeyDeleteSigningPayload,
  passkeyListSigningPayload,
  passkeyRegistrationFinishSigningPayload,
  passkeyRegistrationStartSigningPayload,
  verifyPayload,
} from "@jfa.dev/common/crypto";
import {
  identityAuthSchema,
  identityIdSchema,
  passkeyAuthenticationSchema,
  passkeyCredentialIdSchema,
  passkeyCredentialSchema,
  passkeyRegistrationSchema,
  passkeySessionIdSchema,
  publicKeySchema,
  signatureSchema,
  type PasskeyAuthentication,
  type PasskeyCredential,
  type PasskeyProfile,
  type PasskeyRegistration,
  type UserProfile,
} from "@jfa.dev/common/identities";
import {
  server,
  type AuthenticationJSON,
  type CredentialInfo,
  type RegistrationJSON,
} from "@passwordless-id/webauthn";
import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import { z } from "zod";

import type { PasskeySession } from "./keweke-passkey";

const registrationStartInputSchema = z.object({ auth: identityAuthSchema });

const registrationFinishInputSchema = z.object({
  sessionId: passkeySessionIdSchema,
  auth: identityAuthSchema,
  registration: passkeyRegistrationSchema,
});

const adoptionStartInputSchema = z.object({
  targetDeviceId: identityIdSchema,
  targetDevicePublicKey: publicKeySchema,
});

const adoptionFinishInputSchema = z.object({
  sessionId: passkeySessionIdSchema,
  authentication: passkeyAuthenticationSchema,
  deviceSignature: signatureSchema,
});

const listInputSchema = z.object({ auth: identityAuthSchema });

const deleteInputSchema = z.object({
  auth: identityAuthSchema,
  credentialId: passkeyCredentialIdSchema,
});

type PasskeyReadyRegistration = {
  status: "ready";
  sessionId: string;
  challenge: string;
  userId: string;
  username: string;
};

type PasskeyReadyAdoption = {
  status: "ready";
  sessionId: string;
  challenge: string;
};

type PasskeyFinishStatus =
  | { status: "expired" | "invalid" | "unauthorized" }
  | { status: "registered" | "existing"; credentialId: string };

type PasskeyAdoptionStatus =
  | { status: "expired" | "invalid" | "unauthorized" }
  | { status: "adopted"; profile: UserProfile };

function relyingParty(): { origin: string; domain: string } {
  const url = new URL(getRequestUrl({ xForwardedHost: true }));
  return { origin: url.origin, domain: url.hostname };
}

function toRegistrationJSON(registration: PasskeyRegistration): RegistrationJSON {
  return {
    id: registration.id,
    rawId: registration.rawId,
    response: {
      attestationObject: registration.response.attestationObject,
      authenticatorData: registration.response.authenticatorData,
      clientDataJSON: registration.response.clientDataJSON,
      transports: registration.response.transports,
      publicKey: registration.response.publicKey,
      publicKeyAlgorithm: registration.response.publicKeyAlgorithm,
    },
    authenticatorAttachment: registration.authenticatorAttachment ?? undefined,
    clientExtensionResults: registration.clientExtensionResults,
    type: registration.type,
    user: registration.user,
  };
}

function toAuthenticationJSON(authentication: PasskeyAuthentication): AuthenticationJSON {
  return {
    id: authentication.id,
    rawId: authentication.rawId,
    response: {
      authenticatorData: authentication.response.authenticatorData,
      clientDataJSON: authentication.response.clientDataJSON,
      signature: authentication.response.signature,
      userHandle: authentication.response.userHandle,
    },
    authenticatorAttachment: authentication.authenticatorAttachment ?? undefined,
    clientExtensionResults: authentication.clientExtensionResults,
    type: authentication.type,
  };
}

function credentialInfo(credential: PasskeyCredential): CredentialInfo {
  return {
    id: credential.id,
    publicKey: credential.publicKey,
    algorithm: credential.algorithm,
    transports: credential.transports,
  };
}

function credentialFromRegistration(info: {
  credential: CredentialInfo;
  authenticator: { counter: number };
  synced: boolean;
}): PasskeyCredential {
  return passkeyCredentialSchema.parse({
    id: info.credential.id,
    publicKey: info.credential.publicKey,
    algorithm: info.credential.algorithm,
    transports: info.credential.transports,
    counter: info.authenticator.counter,
    synced: info.synced,
  });
}

function userIdFromHandle(userHandle: string | undefined): string | null {
  if (!userHandle) {
    return null;
  }

  try {
    const decoded = new TextDecoder().decode(base64UrlDecode(userHandle));
    const parsed = identityIdSchema.safeParse(decoded);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function getSession(sessionId: string): Promise<PasskeySession | null> {
  return env.KEWEKE_PASSKEY_SESSIONS.getByName(sessionId).getSession();
}

export const startPasskeyRegistration = createServerFn({ method: "POST" })
  .validator(registrationStartInputSchema)
  .handler(async ({ data }): Promise<PasskeyReadyRegistration | { status: "unauthorized" }> => {
    const payload = passkeyRegistrationStartSigningPayload({
      userId: data.auth.userId,
      deviceId: data.auth.deviceId,
    });
    const authorized = await env.KEWEKE_USERS.getByName(data.auth.userId).authorizeMutation({
      auth: data.auth,
      payload,
    });
    if (!authorized) {
      return { status: "unauthorized" };
    }

    const sessionId = crypto.randomUUID();
    const session = await env.KEWEKE_PASSKEY_SESSIONS.getByName(sessionId).startRegistration({
      userId: authorized.userId,
      deviceId: authorized.deviceId,
      devicePublicKey: authorized.devicePublicKey,
    });
    if (session.flow !== "registration") {
      throw new Error("Passkey registration session has the wrong flow");
    }

    return {
      status: "ready",
      sessionId,
      challenge: session.challenge,
      userId: session.userId,
      username: authorized.username,
    };
  });

export const completePasskeyRegistration = createServerFn({ method: "POST" })
  .validator(registrationFinishInputSchema)
  .handler(async ({ data }): Promise<PasskeyFinishStatus> => {
    const session = await getSession(data.sessionId);
    if (!session || session.flow !== "registration") {
      return { status: "expired" };
    }
    if (session.userId !== data.auth.userId || session.deviceId !== data.auth.deviceId) {
      return { status: "unauthorized" };
    }

    const payload = passkeyRegistrationFinishSigningPayload({
      sessionId: data.sessionId,
      userId: session.userId,
      deviceId: session.deviceId,
      credentialId: data.registration.id,
    });
    const authorized = await env.KEWEKE_USERS.getByName(session.userId).authorizeMutation({
      auth: data.auth,
      payload,
    });
    if (!authorized || authorized.devicePublicKey !== session.devicePublicKey) {
      return { status: "unauthorized" };
    }

    let registrationInfo;
    try {
      const party = relyingParty();
      registrationInfo = await server.verifyRegistration(toRegistrationJSON(data.registration), {
        challenge: session.challenge,
        origin: party.origin,
        domain: party.domain,
        userVerified: true,
      });
    } catch {
      return { status: "invalid" };
    }

    if (
      registrationInfo.user.id !== session.userId ||
      data.registration.user.id !== session.userId
    ) {
      return { status: "invalid" };
    }

    let credential: PasskeyCredential;
    try {
      credential = credentialFromRegistration(registrationInfo);
    } catch {
      return { status: "invalid" };
    }
    if (!(await env.KEWEKE_PASSKEY_SESSIONS.getByName(data.sessionId).finish())) {
      return { status: "expired" };
    }
    const result = await env.KEWEKE_USERS.getByName(session.userId).registerPasskey({
      userId: session.userId,
      credential,
    });
    if (result.status === "unauthorized") {
      return result;
    }

    return { status: result.status, credentialId: credential.id };
  });

export const startPasskeyAdoption = createServerFn({ method: "POST" })
  .validator(adoptionStartInputSchema)
  .handler(async ({ data }): Promise<PasskeyReadyAdoption> => {
    const sessionId = crypto.randomUUID();
    const session = await env.KEWEKE_PASSKEY_SESSIONS.getByName(sessionId).startAdoption(data);
    if (session.flow !== "adoption") {
      throw new Error("Passkey adoption session has the wrong flow");
    }

    return {
      status: "ready",
      sessionId,
      challenge: session.challenge,
    };
  });

export const completePasskeyAdoption = createServerFn({ method: "POST" })
  .validator(adoptionFinishInputSchema)
  .handler(async ({ data }): Promise<PasskeyAdoptionStatus> => {
    const session = await getSession(data.sessionId);
    if (!session || session.flow !== "adoption") {
      return { status: "expired" };
    }

    const userId = userIdFromHandle(data.authentication.response.userHandle);
    if (!userId) {
      return { status: "invalid" };
    }

    const payload = passkeyAdoptionFinishSigningPayload({
      sessionId: data.sessionId,
      targetDeviceId: session.targetDeviceId,
      credentialId: data.authentication.id,
    });
    const deviceSignatureValid = await verifyPayload(
      session.targetDevicePublicKey,
      data.deviceSignature,
      payload,
    );
    if (!deviceSignatureValid) {
      return { status: "unauthorized" };
    }

    const credential = await env.KEWEKE_USERS.getByName(userId).getPasskeyCredential({
      userId,
      credentialId: data.authentication.id,
    });
    if (!credential) {
      return { status: "unauthorized" };
    }

    let authenticationInfo;
    try {
      const party = relyingParty();
      authenticationInfo = await server.verifyAuthentication(
        toAuthenticationJSON(data.authentication),
        credentialInfo(credential),
        {
          challenge: session.challenge,
          origin: party.origin,
          domain: party.domain,
          userVerified: true,
          ...(!credential.synced && credential.counter > 0
            ? { counter: credential.counter }
            : {}),
        },
      );
    } catch {
      return { status: "invalid" };
    }

    if (
      authenticationInfo.credentialId !== credential.id ||
      authenticationInfo.userId !== data.authentication.response.userHandle
    ) {
      return { status: "invalid" };
    }

    if (!(await env.KEWEKE_PASSKEY_SESSIONS.getByName(data.sessionId).finish())) {
      return { status: "expired" };
    }

    const result = await env.KEWEKE_USERS.getByName(userId).approveDeviceByPasskey({
      userId,
      targetDeviceId: session.targetDeviceId,
      targetDevicePublicKey: session.targetDevicePublicKey,
      credentialId: credential.id,
      counter: authenticationInfo.counter,
    });
    if (result.status === "unauthorized") {
      return result;
    }

    return { status: "adopted", profile: result.profile };
  });

export const listPasskeys = createServerFn()
  .validator(listInputSchema)
  .handler(
    async ({
      data,
    }): Promise<{ status: "ok"; passkeys: PasskeyProfile[] } | { status: "unauthorized" }> => {
      const payload = passkeyListSigningPayload({
        userId: data.auth.userId,
        deviceId: data.auth.deviceId,
      });
      const passkeys = await env.KEWEKE_USERS.getByName(data.auth.userId).listPasskeys({
        auth: data.auth,
        payload,
      });
      return passkeys
        ? { status: "ok", passkeys: JSON.parse(JSON.stringify(passkeys)) as PasskeyProfile[] }
        : { status: "unauthorized" };
    },
  );

export const deletePasskey = createServerFn({ method: "POST" })
  .validator(deleteInputSchema)
  .handler(
    async ({
      data,
    }): Promise<{ status: "deleted"; passkeys: PasskeyProfile[] } | { status: "unauthorized" }> => {
      const payload = passkeyDeleteSigningPayload({
        userId: data.auth.userId,
        deviceId: data.auth.deviceId,
        credentialId: data.credentialId,
      });
      const passkeys = await env.KEWEKE_USERS.getByName(data.auth.userId).deletePasskey({
        auth: data.auth,
        credentialId: data.credentialId,
        payload,
      });
      return passkeys
        ? { status: "deleted", passkeys: JSON.parse(JSON.stringify(passkeys)) as PasskeyProfile[] }
        : { status: "unauthorized" };
    },
  );
