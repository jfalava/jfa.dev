import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@jfa.dev/common/ui";
import { blobatarUri } from "blobatar/uri";

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

type MockRow = {
  eyebrow: string;
  eyebrowTone?: "destructive";
  subheading: string;
  description: string;
  actionLabel?: string;
  actionVariant?: "default" | "outline" | "destructive";
};

const mockRows: MockRow[] = [
  {
    eyebrow: "username",
    subheading: "Your display name across lists",
    description: "Set the name attached to your list edits and items.",
    actionLabel: "Save",
  },
  {
    eyebrow: "remote account",
    subheading: "Use this user across browsers",
    description: "Create a remote user so you can pair other browsers and publish lists.",
    actionLabel: "Create remote user",
  },
  {
    eyebrow: "pair a browser",
    subheading: "Use on another device",
    description: "Generate a pairing code and approve it from an existing device.",
    actionLabel: "Show pairing code",
  },
  {
    eyebrow: "approve a browser",
    subheading: "Add another device",
    description: "Enter the ten-character pairing code shown on another device.",
    actionLabel: "Find",
  },
  {
    eyebrow: "accepted devices",
    subheading: "Manage devices",
    description: "Every active device that can sign mutations.",
    actionLabel: undefined,
  },
  {
    eyebrow: "passkeys",
    subheading: "Sign in without pairing codes",
    description: "Add passkeys to instantly adopt a new browser.",
    actionLabel: "Add passkey",
  },
  {
    eyebrow: "session",
    subheading: "Log out",
    description: "Disconnect this identity from this browser. Lists are retained.",
    actionLabel: "Log out",
    actionVariant: "outline",
  },
  {
    eyebrow: "local data",
    subheading: "Clear this browser",
    description: "Remove local lists, identity, and stored data. Remote lists not deleted.",
    actionLabel: "Clear data",
    actionVariant: "destructive",
  },
];

function SettingsTableMock() {
  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-56 sm:w-72">Setting</TableHead>
            <TableHead>Details</TableHead>
            <TableHead className="hidden sm:table-cell" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockRows.map((row) => (
            <TableRow className="hover:bg-transparent" key={row.eyebrow}>
              <TableCell className="py-6 align-top">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p
                    className={`font-mono text-[10px] tracking-widest uppercase ${row.eyebrowTone === "destructive" ? "text-destructive" : "text-primary"}`}
                  >
                    {row.eyebrow}
                  </p>
                  <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                    /
                  </span>
                  <span className="text-[11px] font-normal text-muted-foreground/75">
                    {row.subheading}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-6 align-top">
                <div>
                  <p className="text-sm text-muted-foreground">{row.description}</p>
                  {row.actionLabel ? (
                    <div className="mt-3 sm:hidden">
                      <Button size="sm" variant={row.actionVariant ?? "default"} className="w-full">
                        {row.actionLabel}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="hidden py-6 align-top sm:table-cell">
                {row.actionLabel ? (
                  <Button size="sm" variant={row.actionVariant ?? "default"}>
                    {row.actionLabel}
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function UserSettingsPreview({
  variant = "remote",
}: {
  variant?: "anonymous" | "local" | "remote";
}) {
  const meta =
    variant === "anonymous"
      ? {
          label: "Anonymous",
          name: "Anonymous",
          username: null,
          userId: "anonymous-preview-id",
        }
      : variant === "local"
        ? {
            label: "Local user",
            name: "alice",
            username: "alice",
            userId: "preview-user-alice",
          }
        : {
            label: "Remote user",
            name: "alice",
            username: "alice",
            userId: "preview-user-alice",
          };

  return (
    <PreviewShell>
      <div className="flex flex-col">
        <div className="flex items-center justify-between border-b bg-background px-3 py-2">
          <span className="font-sans text-sm font-black tracking-tighter text-primary">KEWEKE</span>
          <span className="font-mono text-[10px] tracking-wide text-muted-foreground">
            /keweke/user
          </span>
        </div>
        <div className="invoice-rule flex flex-col gap-4 border-b px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-6">
          <div>
            <h1 className="mt-1 text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-5xl">
              User settings
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="min-w-0 sm:text-right">
              <p className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                {meta.label}
              </p>
              <p className="mt-0.5 font-serif text-base font-medium text-foreground sm:text-lg">
                {meta.name}
              </p>
            </div>
            <img
              alt=""
              className="size-12 shrink-0 sm:size-14"
              height={64}
              src={blobatarUri(userAvatarSeed(meta.userId, meta.username), { size: 64 })}
              width={64}
            />
          </div>
        </div>
        <SettingsTableMock />
      </div>
    </PreviewShell>
  );
}

export function UserStateBadgePreview() {
  return (
    <div className="not-prose my-4 grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-3">
      {(
        [
          {
            label: "Anonymous",
            name: "Anonymous",
            username: null,
            userId: "anonymous-preview-id",
            desc: "No username yet. signed badges show unsigned.",
          },
          {
            label: "Local user",
            name: "alice",
            username: "alice",
            userId: "preview-user-alice",
            desc: 'username="alice" stored locally only.',
          },
          {
            label: "Remote user",
            name: "alice",
            username: "alice",
            userId: "preview-user-alice",
            desc: "remoteUsername confirmed. Can publish & sign remotely.",
          },
        ] as const
      ).map((state) => (
        <div key={state.label} className="flex flex-col gap-2 rounded-md border bg-background p-3">
          <div className="flex items-center gap-3">
            <img
              alt=""
              className="size-10 shrink-0"
              height={40}
              src={blobatarUri(userAvatarSeed(state.userId, state.username), { size: 40 })}
              width={40}
            />
            <div>
              <p className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                {state.label}
              </p>
              <p className="font-serif text-sm font-medium">{state.name}</p>
            </div>
          </div>
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            {state.desc}
          </p>
        </div>
      ))}
    </div>
  );
}
