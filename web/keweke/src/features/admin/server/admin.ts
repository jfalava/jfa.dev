import { identityIdSchema, userProfileSchema } from "@jfa.dev/common/identities";
import { listIdSchema } from "@jfa.dev/common/lists";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { z } from "zod";

import type { AdminListSummary } from "@/features/lists/server/keweke-list";

import { assertKewekeAdminAccess } from "./access-auth";

export type { AdminListSummary } from "@/features/lists/server/keweke-list";

const ALIAS_DIRECTORY_NAME = "directory";

export type AdminUserSummary = {
  userId: string;
  username: string;
  createdAt: string;
  deviceCount: number;
  activeDeviceCount: number;
};

export type AdminOverview = {
  users: AdminUserSummary[];
  lists: AdminListSummary[];
};

export type AdminDeletionResult =
  | { status: "deleted" }
  | { status: "failed" }
  | { status: "missing" };

const adminUserInputSchema = z.object({ userId: identityIdSchema });
const adminListInputSchema = z.object({ listId: listIdSchema });

export const getAdminOverview = createServerFn().handler(
  async (): Promise<AdminOverview | null> => {
    try {
      await assertKewekeAdminAccess();
    } catch {
      return null;
    }

    const directory = env.KEWEKE_ALIASES.getByName(ALIAS_DIRECTORY_NAME);
    const [userIds, listIds] = await Promise.all([
      directory.listUserIds(),
      directory.listListIds(),
    ]);

    const profiles = await Promise.all(
      userIds.map((userId) => env.KEWEKE_USERS.getByName(userId).getProfile(userId)),
    );

    const users = profiles
      .flatMap((profile) => {
        const parsed = userProfileSchema.safeParse(profile);
        if (!parsed.success) {
          return [];
        }
        const approvedAt = parsed.data.devices
          .map((device) => device.approvedAt)
          .toSorted((left, right) => left.localeCompare(right));
        return [
          {
            userId: parsed.data.userId,
            username: parsed.data.username,
            createdAt: approvedAt[0] ?? new Date(0).toISOString(),
            deviceCount: parsed.data.devices.length,
            activeDeviceCount: parsed.data.devices.filter((device) => device.revokedAt === null)
              .length,
          },
        ];
      })
      .toSorted(
        (left, right) =>
          left.createdAt.localeCompare(right.createdAt) || left.userId.localeCompare(right.userId),
      );

    const listSummaries = await Promise.all(
      listIds.map((listId) => env.KEWEKE_LISTS.getByName(listId).getAdminSummary(listId)),
    );
    const lists = listSummaries
      .flatMap((summary) =>
        summary
          ? [
              {
                listId: summary.listId,
                alias: summary.alias,
                title: summary.title,
                revision: summary.revision,
                createdAt: summary.createdAt,
                updatedAt: summary.updatedAt,
                ownerUserId: summary.ownerUserId,
                itemCount: summary.itemCount,
                completedCount: summary.completedCount,
              },
            ]
          : [],
      )
      .toSorted(
        (left, right) =>
          right.updatedAt.localeCompare(left.updatedAt) || left.listId.localeCompare(right.listId),
      );

    return { users, lists };
  },
);

export const deleteAdminUser = createServerFn({ method: "POST" })
  .validator(adminUserInputSchema)
  .handler(async ({ data }): Promise<AdminDeletionResult> => {
    await assertKewekeAdminAccess();
    const result = await env.KEWEKE_USERS.getByName(data.userId).deleteAccountAsAdmin(data.userId);
    // SAFETY: The Durable Object returns the AdminDeletionResult contract across the server boundary.
    return JSON.parse(JSON.stringify(result)) as AdminDeletionResult;
  });

export const deleteAdminList = createServerFn({ method: "POST" })
  .validator(adminListInputSchema)
  .handler(async ({ data }): Promise<AdminDeletionResult> => {
    await assertKewekeAdminAccess();

    const directory = env.KEWEKE_ALIASES.getByName(ALIAS_DIRECTORY_NAME);
    const [userIds, result] = await Promise.all([
      directory.listUserIds(),
      env.KEWEKE_LISTS.getByName(data.listId).deleteAsAdmin(data.listId),
    ]);

    if (result.status === "deleted") {
      await Promise.all(
        userIds.map((userId) => env.KEWEKE_USERS.getByName(userId).removeListAsAdmin(data.listId)),
      );
    }

    // SAFETY: The Durable Object returns the AdminDeletionResult contract across the server boundary.
    return JSON.parse(JSON.stringify(result)) as AdminDeletionResult;
  });
