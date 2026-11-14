import { Blobatar } from "blobatar/react";

import { DocsLink } from "@/app/components/docs-link";
import { KewekeHeader } from "@/app/components/keweke-header";
import { kewekeDocs } from "@/app/lib/docs-paths";
import { useUserManager } from "@/features/auth/hooks/use-user-manager";

import { userAvatarSeed } from "../lib/blobatar";

import { SettingsTable } from "./settings-table";
import { createUserSettingsRows } from "./user-settings-sections";

export function UserSettingsPage() {
  const manager = useUserManager({ isActive: true });
  const rows = createUserSettingsRows(manager);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background text-foreground">
      <KewekeHeader />
      <div className="app-frame flex min-h-0 flex-1 flex-col bg-background">
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
          <div className="flex flex-col gap-4 border-b page-gutters py-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="type-page-title">User settings</h1>
              <div className="mt-3">
                <DocsLink href={kewekeDocs.users} variant="info">
                  How identity works
                </DocsLink>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="min-w-0 sm:text-right">
                <p className="text-xs text-muted-foreground">
                  {manager.identity?.remoteUsername
                    ? "Remote user"
                    : manager.identity?.username
                      ? "Local user"
                      : "Anonymous"}
                </p>
                <p className="mt-0.5 font-serif text-base font-medium text-foreground sm:text-lg">
                  {manager.identity?.username ?? "Anonymous"}
                </p>
              </div>
              {manager.identity ? (
                <Blobatar
                  alt=""
                  className="size-12 shrink-0 sm:size-14"
                  name={userAvatarSeed(manager.identity.userId, manager.identity.username)}
                  size={64}
                />
              ) : null}
            </div>
          </div>

          <SettingsTable rows={rows} />
        </main>
      </div>
    </div>
  );
}
