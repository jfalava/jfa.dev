import { blobatarUri } from "blobatar/uri";
import { Pencil, Plus } from "lucide-react";

import { PreviewShell } from "./preview-shell";

/**
 * The blobatar seed for a Keweke user: the stable internal user id followed
 * by the user-chosen username, so every avatar is anchored to its user but
 * changes shape when the user picks a new username. Without a username the
 * seed is the user id alone.
 *
 * Mirrors `web/keweke/src/features/auth/lib/blobatar.ts:7` (`userAvatarSeed`).
 */
function userAvatarSeed(userId: string, username: string | null | undefined): string {
  return `${userId}${username ?? ""}`;
}

export function SignedBadgePreview() {
  return (
    <PreviewShell>
      <div className="overflow-x-auto p-4">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                item
              </th>
              <th className="px-3 py-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                qty
              </th>
              <th className="px-3 py-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                signed
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="px-3 py-3 font-serif text-sm">Bread</td>
              <td className="px-3 py-3 font-mono text-xs">1 EA</td>
              <td className="px-3 py-3">
                <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                  unsigned
                </span>
              </td>
            </tr>
            <tr>
              <td className="px-3 py-3 font-serif text-sm">Milk</td>
              <td className="px-3 py-3 font-mono text-xs">2 EA</td>
              <td className="px-3 py-3">
                <span
                  className="inline-flex max-w-full items-center gap-1 truncate text-[10px] tracking-[0.06em] text-muted-foreground"
                  title="Added by alice"
                >
                  <Plus aria-hidden="true" className="size-3 shrink-0" />
                  <img
                    alt=""
                    className="size-4 shrink-0"
                    height={16}
                    src={blobatarUri(userAvatarSeed("preview-user-alice", "alice"), { size: 16 })}
                    width={16}
                  />
                  <span className="truncate font-serif">alice</span>
                </span>
              </td>
            </tr>
            <tr>
              <td className="px-3 py-3 font-serif text-sm">Coffee · edited</td>
              <td className="px-3 py-3 font-mono text-xs">1 BAG</td>
              <td className="px-3 py-3">
                <span
                  className="inline-flex max-w-full items-center gap-1 truncate text-[10px] tracking-[0.06em] text-muted-foreground"
                  title="Added by alice · Last edited by bob"
                >
                  <Pencil aria-hidden="true" className="size-3 shrink-0" />
                  <img
                    alt=""
                    className="size-4 shrink-0"
                    height={16}
                    src={blobatarUri(userAvatarSeed("preview-user-bob", "bob"), { size: 16 })}
                    width={16}
                  />
                  <span className="truncate font-serif">bob</span>
                </span>
              </td>
            </tr>
            <tr>
              <td className="px-3 py-3 font-serif text-sm">Tomatoes</td>
              <td className="px-3 py-3 font-mono text-xs">6 EA</td>
              <td className="px-3 py-3">
                <span
                  className="inline-flex max-w-full items-center gap-1 truncate text-[10px] tracking-[0.06em] text-muted-foreground"
                  title="Added by Your username"
                >
                  <Plus aria-hidden="true" className="size-3 shrink-0" />
                  <img
                    alt=""
                    className="size-4 shrink-0"
                    height={16}
                    src={blobatarUri(userAvatarSeed("preview-user-you", "Your username"), {
                      size: 16,
                    })}
                    width={16}
                  />
                  <span className="truncate font-serif">Your username</span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </PreviewShell>
  );
}

export function HeaderUserButtonPreview() {
  return (
    <div className="not-prose my-4 flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2.5">
      <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1">
        <span
          aria-hidden="true"
          className="flex size-5 items-center justify-center rounded-full bg-primary/15 font-mono text-[10px] font-bold text-primary"
        >
          U
        </span>
        <span className="font-mono text-[11px] tracking-wide">User</span>
      </div>
      <span className="font-mono text-[11px] tracking-wide text-muted-foreground">
        in KewekeHeader — opens the device identity dialog.
      </span>
    </div>
  );
}
