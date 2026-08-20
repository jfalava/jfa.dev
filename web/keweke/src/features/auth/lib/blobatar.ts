/**
 * The blobatar seed for a Keweke user: the stable internal user id followed
 * by the user-chosen username, so every avatar is anchored to its user but
 * changes shape when the user picks a new username. Without a username the
 * seed is the user id alone.
 */
export function userAvatarSeed(userId: string, username: string | null | undefined): string {
  return `${userId}${username ?? ""}`;
}
