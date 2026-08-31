import { Blobatar } from "blobatar/react";

import { KewekeHeader } from "@/app/components/keweke-header";
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
      <div className="mx-auto flex min-h-0 w-full max-w-screen-2xl flex-1 flex-col border-x border-border bg-background">
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
          <div className="invoice-rule flex flex-col gap-4 border-b px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-6 lg:px-8">
            <div className="min-w-0 flex-1">
              <h1 className="mt-1 font-sans text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-6xl">
                User settings
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="min-w-0 sm:text-right">
                <p className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
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
