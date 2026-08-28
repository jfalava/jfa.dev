import {
  listSnapshotSchema,
  type ListItemHistoryPage,
  type ListSnapshot,
} from "@jfa.dev/common/lists";
import { env } from "cloudflare:workers";
import * as Schema from "effect/Schema";

const ALIAS_DIRECTORY_NAME = "directory";

export async function readRemoteList(listId: string) {
  const snapshot = await env.KEWEKE_LISTS.getByName(listId).getSnapshot(listId);
  if (!snapshot) {
    return null;
  }

  const alias = await env.KEWEKE_ALIASES.getByName(ALIAS_DIRECTORY_NAME).getAlias(listId);
  return resolveActorNames(
    Schema.decodeUnknownSync(listSnapshotSchema)({ ...snapshot, alias: alias ?? snapshot.alias }),
  );
}

export async function resolveActorNames(snapshot: ListSnapshot) {
  const userIds = new Set<string>();
  for (const item of snapshot.items) {
    if (item.createdBy) {
      userIds.add(item.createdBy.id);
    }
    if (item.updatedBy) {
      userIds.add(item.updatedBy.id);
    }
  }
  for (const item of snapshot.deletedItems) {
    if (item.createdBy) {
      userIds.add(item.createdBy.id);
    }
    if (item.updatedBy) {
      userIds.add(item.updatedBy.id);
    }
    if (item.deletedBy) {
      userIds.add(item.deletedBy.id);
    }
  }

  const profiles = await Promise.all(
    [...userIds].map(
      async (userId) =>
        [userId, await env.KEWEKE_USERS.getByName(userId).getProfile(userId)] as const,
    ),
  );
  const usernames = new Map<string, string>();
  for (const [userId, profile] of profiles) {
    if (profile) {
      usernames.set(userId, profile.username);
    }
  }
  const currentIdentity = (identity: { id: string; username: string | null } | null) =>
    identity ? { ...identity, username: usernames.get(identity.id) ?? identity.username } : null;

  return Schema.decodeUnknownSync(listSnapshotSchema)({
    ...snapshot,
    items: snapshot.items.map((item) => ({
      ...item,
      createdBy: currentIdentity(item.createdBy),
      updatedBy: currentIdentity(item.updatedBy),
    })),
    deletedItems: snapshot.deletedItems.map((item) => ({
      ...item,
      createdBy: currentIdentity(item.createdBy),
      updatedBy: currentIdentity(item.updatedBy),
      deletedBy: currentIdentity(item.deletedBy),
    })),
  });
}

export async function resolveHistoryActorNames(page: ListItemHistoryPage) {
  const userIds = new Set<string>();
  for (const event of page.events) {
    if (event.actor) {
      userIds.add(event.actor.id);
    }
  }

  const profiles = await Promise.all(
    [...userIds].map(
      async (userId) =>
        [userId, await env.KEWEKE_USERS.getByName(userId).getProfile(userId)] as const,
    ),
  );
  const usernames = new Map<string, string>();
  for (const [userId, profile] of profiles) {
    if (profile) {
      usernames.set(userId, profile.username);
    }
  }

  return {
    ...page,
    events: page.events.map((event) => ({
      ...event,
      actor: event.actor
        ? { ...event.actor, username: usernames.get(event.actor.id) ?? event.actor.username }
        : null,
    })),
  };
}
