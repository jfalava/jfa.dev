/// <reference types="bun" />

import { describe, expect, test } from "bun:test";

import {
  exportPublicKey,
  generateEd25519KeyPair,
  listDeletionSigningPayload,
  listMutationSigningPayload,
  publicKeyFingerprint,
  signPayload,
  userDeleteSigningPayload,
  userListsSigningPayload,
  verifyPayload,
} from "./crypto";

describe("identity cryptography", () => {
  test("signs and verifies the canonical mutation payload", async () => {
    const keys = await generateEd25519KeyPair();
    const publicKey = await exportPublicKey(keys.publicKey);
    const userId = await publicKeyFingerprint(publicKey);
    const mutation = {
      id: "mutation-1",
      baseRevision: 0,
      actor: { id: userId, username: "Alex" },
      auth: {
        userId,
        deviceId: userId,
        signature: "unsigned-signature-placeholder",
      },
      command: { type: "rename-list" as const, title: "Saturday market" },
    };
    const payload = listMutationSigningPayload(mutation);
    const signature = await signPayload(keys.privateKey, payload);

    expect(await verifyPayload(publicKey, signature, payload)).toBe(true);
    expect(await verifyPayload(publicKey, signature, `${payload}!`)).toBe(false);
  });

  test("signs and verifies the user-list index payload", async () => {
    const keys = await generateEd25519KeyPair();
    const publicKey = await exportPublicKey(keys.publicKey);
    const userId = await publicKeyFingerprint(publicKey);
    const payload = userListsSigningPayload({ userId, deviceId: userId });
    const signature = await signPayload(keys.privateKey, payload);

    expect(await verifyPayload(publicKey, signature, payload)).toBe(true);
    expect(
      await verifyPayload(
        publicKey,
        signature,
        userListsSigningPayload({ userId, deviceId: "B".repeat(43) }),
      ),
    ).toBe(false);
  });

  test("signs and verifies the account deletion payload", async () => {
    const keys = await generateEd25519KeyPair();
    const publicKey = await exportPublicKey(keys.publicKey);
    const userId = await publicKeyFingerprint(publicKey);
    const payload = userDeleteSigningPayload({ userId, deviceId: userId });
    const signature = await signPayload(keys.privateKey, payload);

    expect(await verifyPayload(publicKey, signature, payload)).toBe(true);
    expect(
      await verifyPayload(
        publicKey,
        signature,
        userDeleteSigningPayload({ userId, deviceId: "B".repeat(43) }),
      ),
    ).toBe(false);
  });

  test("binds remote list deletion payloads to the list and device", () => {
    const payload = listDeletionSigningPayload({
      listId: "019c5f7e-7b7b-7000-8000-000000000010",
      userId: "A".repeat(43),
      deviceId: "B".repeat(43),
    });

    expect(payload).toContain("keweke:list-deletion:v1");
    expect(payload).toContain("019c5f7e-7b7b-7000-8000-000000000010");
    expect(payload).not.toBe(
      listDeletionSigningPayload({
        listId: "019c5f7e-7b7b-7000-8000-000000000011",
        userId: "A".repeat(43),
        deviceId: "B".repeat(43),
      }),
    );
  });
});
