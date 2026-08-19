import type { PasskeyProfile, UserProfile } from "@jfa.dev/common/identities";
import {
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@jfa.dev/common/ui";
import { createFileRoute } from "@tanstack/react-router";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { Blobatar } from "blobatar/react";
import { Check, KeyRound, Shield, Smartphone, Trash2 } from "lucide-react";
import { useMemo, type ReactNode } from "react";

import { KewekeHeader } from "@/components/keweke-header";
import {
  useUserManager,
  type DialogFeedback,
  type FeedbackSection,
} from "@/hooks/use-user-manager";
import { userAvatarSeed } from "@/lib/blobatar";
import { LOCAL_IDENTITY_PLACEHOLDER, type LocalIdentity } from "@/lib/local-identity";

export const Route = createFileRoute("/user")({
  component: UserRoutePage,
});

function FeedbackMessage({
  feedback,
  section,
}: {
  feedback?: DialogFeedback;
  section: FeedbackSection;
}) {
  if (feedback?.section !== section) {
    return null;
  }

  return (
    <p
      className={
        feedback.tone === "error"
          ? "mt-2 text-sm font-medium text-destructive"
          : "mt-2 text-sm font-medium text-primary"
      }
    >
      {feedback.text}
    </p>
  );
}

function formatPasskeyDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

/* -------------------------------------------------------------------------
 * Accepted devices table
 * ---------------------------------------------------------------------- */

type DeviceRow = {
  deviceId: string;
  isCurrent: boolean;
  isRevoked: boolean;
};

const devicesTableFeatures = tableFeatures({});
const devicesColumnHelper = createColumnHelper<typeof devicesTableFeatures, DeviceRow>();

// Desktop shows one column per field (Device, Device ID, Status, Actions); mobile collapses
// Device/Device ID/Status into a single "info" column so only two columns remain.
const DEVICE_COLUMN_CLASSNAMES = {
  info: "sm:hidden",
  device: "hidden sm:table-cell",
  deviceId: "hidden sm:table-cell",
  status: "hidden sm:table-cell",
  actions: "text-right",
} satisfies Record<string, string>;

type DeviceColumnId = keyof typeof DEVICE_COLUMN_CLASSNAMES;

function isDeviceColumnId(id: string): id is DeviceColumnId {
  return Object.hasOwn(DEVICE_COLUMN_CLASSNAMES, id);
}

function deviceColumnClassName(id: string): string | undefined {
  return isDeviceColumnId(id) ? DEVICE_COLUMN_CLASSNAMES[id] : undefined;
}

function DeviceLabel({ isCurrent }: { isCurrent: boolean }) {
  return <p className="text-sm font-medium">{isCurrent ? "This device" : "Other device"}</p>;
}

function DeviceStatus({ isRevoked }: { isRevoked: boolean }) {
  return isRevoked ? (
    <span className="text-sm font-medium text-destructive">Revoked</span>
  ) : (
    <span className="text-sm font-medium text-primary">Active</span>
  );
}

function DeviceRowActions({
  deviceId,
  isRevoked,
  confirmingDeviceId,
  forgettingDeviceId,
  onCancelForget,
  onCancelRevoke,
  onConfirmForget,
  onConfirmRevoke,
  onForget,
  onRevoke,
}: {
  deviceId: string;
  isRevoked: boolean;
  confirmingDeviceId?: string;
  forgettingDeviceId?: string;
  onCancelForget: () => void;
  onCancelRevoke: () => void;
  onConfirmForget: (deviceId: string) => void;
  onConfirmRevoke: (deviceId: string) => void;
  onForget: (deviceId: string) => void;
  onRevoke: (deviceId: string) => void;
}) {
  if (isRevoked) {
    if (forgettingDeviceId === deviceId) {
      return (
        <div className="flex shrink-0 justify-end gap-1.5">
          <Button onPress={() => onForget(deviceId)} size="sm" variant="destructive">
            Confirm
          </Button>
          <Button onPress={onCancelForget} size="sm" variant="ghost">
            Cancel
          </Button>
        </div>
      );
    }
    return (
      <div className="flex justify-end">
        <Button
          className="gap-1.5"
          onPress={() => onConfirmForget(deviceId)}
          size="sm"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" className="size-3.5" />
          Delete
        </Button>
      </div>
    );
  }

  if (confirmingDeviceId === deviceId) {
    return (
      <div className="flex shrink-0 justify-end gap-1.5">
        <Button onPress={() => onRevoke(deviceId)} size="sm" variant="destructive">
          Confirm
        </Button>
        <Button onPress={onCancelRevoke} size="sm" variant="ghost">
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <Button onPress={() => onConfirmRevoke(deviceId)} size="sm" variant="ghost">
        Revoke
      </Button>
    </div>
  );
}

function createDevicesColumns({
  confirmingDeviceId,
  forgettingDeviceId,
  onCancelForget,
  onCancelRevoke,
  onConfirmForget,
  onConfirmRevoke,
  onForget,
  onRevoke,
}: {
  confirmingDeviceId?: string;
  forgettingDeviceId?: string;
  onCancelForget: () => void;
  onCancelRevoke: () => void;
  onConfirmForget: (deviceId: string) => void;
  onConfirmRevoke: (deviceId: string) => void;
  onForget: (deviceId: string) => void;
  onRevoke: (deviceId: string) => void;
}) {
  return devicesColumnHelper.columns([
    devicesColumnHelper.display({
      id: "info",
      header: "Device",
      cell: ({ row }) => (
        <div className="min-w-0">
          <DeviceLabel isCurrent={row.original.isCurrent} />
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {row.original.deviceId.slice(0, 16)}… ·{" "}
            {row.original.isRevoked ? (
              <span className="text-destructive">Revoked</span>
            ) : (
              <span className="text-primary">Active</span>
            )}
          </p>
        </div>
      ),
    }),
    devicesColumnHelper.display({
      id: "device",
      header: "Device",
      cell: ({ row }) => <DeviceLabel isCurrent={row.original.isCurrent} />,
    }),
    devicesColumnHelper.display({
      id: "deviceId",
      header: "Device ID",
      cell: ({ row }) => (
        <p className="font-mono text-[11px] break-all text-muted-foreground">
          {row.original.deviceId}
        </p>
      ),
    }),
    devicesColumnHelper.display({
      id: "status",
      header: "Status",
      cell: ({ row }) => <DeviceStatus isRevoked={row.original.isRevoked} />,
    }),
    devicesColumnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DeviceRowActions
          confirmingDeviceId={confirmingDeviceId}
          deviceId={row.original.deviceId}
          forgettingDeviceId={forgettingDeviceId}
          isRevoked={row.original.isRevoked}
          onCancelForget={onCancelForget}
          onCancelRevoke={onCancelRevoke}
          onConfirmForget={onConfirmForget}
          onConfirmRevoke={onConfirmRevoke}
          onForget={onForget}
          onRevoke={onRevoke}
        />
      ),
    }),
  ]);
}

function DevicesTable({
  confirmingDeviceId,
  forgettingDeviceId,
  identity,
  onCancelForget,
  onCancelRevoke,
  onConfirmForget,
  onConfirmRevoke,
  onForget,
  onRevoke,
  profile,
}: {
  confirmingDeviceId?: string;
  forgettingDeviceId?: string;
  identity?: LocalIdentity;
  onCancelForget: () => void;
  onCancelRevoke: () => void;
  onConfirmForget: (deviceId: string) => void;
  onConfirmRevoke: (deviceId: string) => void;
  onForget: (deviceId: string) => void;
  onRevoke: (deviceId: string) => void;
  profile: UserProfile;
}) {
  const rows = useMemo<DeviceRow[]>(
    () =>
      profile.devices.map((device) => ({
        deviceId: device.deviceId,
        isCurrent: device.deviceId === identity?.deviceId,
        isRevoked: device.revokedAt !== null,
      })),
    [identity?.deviceId, profile.devices],
  );
  const columns = useMemo(
    () =>
      createDevicesColumns({
        confirmingDeviceId,
        forgettingDeviceId,
        onCancelForget,
        onCancelRevoke,
        onConfirmForget,
        onConfirmRevoke,
        onForget,
        onRevoke,
      }),
    [
      confirmingDeviceId,
      forgettingDeviceId,
      onCancelForget,
      onCancelRevoke,
      onConfirmForget,
      onConfirmRevoke,
      onForget,
      onRevoke,
    ],
  );
  const table = useTable({
    features: devicesTableFeatures,
    data: rows,
    columns,
    getRowId: (row) => row.deviceId,
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow className="hover:bg-transparent" key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead className={deviceColumnClassName(header.column.id)} key={header.id}>
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell className={deviceColumnClassName(cell.column.id)} key={cell.id}>
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* -------------------------------------------------------------------------
 * Passkeys table
 * ---------------------------------------------------------------------- */

type PasskeyRow = {
  createdAt: string;
  id: string;
  index: number;
  synced: boolean;
  transports: string[];
};

const passkeysTableFeatures = tableFeatures({});
const passkeysColumnHelper = createColumnHelper<typeof passkeysTableFeatures, PasskeyRow>();

const passkeysColumns = passkeysColumnHelper.columns([
  passkeysColumnHelper.display({
    id: "passkey",
    header: "Passkey",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center border border-border bg-muted/40 text-primary">
          <KeyRound aria-hidden="true" className="size-4" />
        </div>
        <p className="text-sm font-medium">Passkey {row.original.index + 1}</p>
      </div>
    ),
  }),
  passkeysColumnHelper.display({
    id: "added",
    header: "Added",
    cell: ({ row }) => (
      <span className="text-[11px] text-muted-foreground">
        {formatPasskeyDate(row.original.createdAt)}
      </span>
    ),
  }),
  passkeysColumnHelper.display({
    id: "sync",
    header: "Sync",
    cell: ({ row }) => (
      <span className="text-[11px] text-muted-foreground">
        {row.original.synced ? "Available to sync" : "Device-bound"}
        {row.original.transports.length > 0 ? ` · ${row.original.transports.join(", ")}` : ""}
      </span>
    ),
  }),
]);

function PasskeysTable({ passkeys }: { passkeys: PasskeyProfile[] }) {
  const rows = useMemo<PasskeyRow[]>(
    () =>
      passkeys.map((passkey, index) => ({
        createdAt: passkey.createdAt,
        id: passkey.id,
        index,
        synced: passkey.synced,
        transports: passkey.transports,
      })),
    [passkeys],
  );
  const table = useTable({
    features: passkeysTableFeatures,
    data: rows,
    columns: passkeysColumns,
    getRowId: (row) => row.id,
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow className="hover:bg-transparent" key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id}>
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* -------------------------------------------------------------------------
 * Master settings table
 * ---------------------------------------------------------------------- */

type SettingsSectionRow = {
  action?: ReactNode;
  content: ReactNode;
  description: ReactNode;
  eyebrow: string;
  eyebrowTone?: "destructive";
  id: string;
  subheading: string;
};

const settingsTableFeatures = tableFeatures({});
const settingsColumnHelper = createColumnHelper<typeof settingsTableFeatures, SettingsSectionRow>();

// Desktop shows Setting/Details/Action; mobile hides the Action column and renders the
// action below the details content, spanning the full details cell width.
const SETTINGS_COLUMN_CLASSNAMES = {
  action: "hidden sm:table-cell",
} satisfies Record<string, string>;

type SettingsColumnId = keyof typeof SETTINGS_COLUMN_CLASSNAMES;

function isSettingsColumnId(id: string): id is SettingsColumnId {
  return Object.hasOwn(SETTINGS_COLUMN_CLASSNAMES, id);
}

function settingsColumnClassName(id: string): string | undefined {
  return isSettingsColumnId(id) ? SETTINGS_COLUMN_CLASSNAMES[id] : undefined;
}

const settingsColumns = settingsColumnHelper.columns([
  settingsColumnHelper.display({
    id: "setting",
    header: "Setting",
    cell: ({ row }) => (
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p
          className={
            row.original.eyebrowTone === "destructive"
              ? "font-mono text-[10px] tracking-widest text-destructive uppercase"
              : "font-mono text-[10px] tracking-widest text-primary uppercase"
          }
        >
          {row.original.eyebrow}
        </p>
        <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
          /
        </span>
        <span className="text-[11px] font-normal text-muted-foreground/75">
          {row.original.subheading}
        </span>
      </div>
    ),
  }),
  settingsColumnHelper.display({
    id: "details",
    header: "Details",
    cell: ({ row }) => (
      <div>
        <p className="text-sm text-muted-foreground">{row.original.description}</p>
        <div className="mt-3">{row.original.content}</div>
        {row.original.action ? (
          <div className="mt-3 sm:hidden [&_button]:w-full">{row.original.action}</div>
        ) : null}
      </div>
    ),
  }),
  settingsColumnHelper.display({
    id: "action",
    header: "",
    cell: ({ row }) => row.original.action ?? null,
  }),
]);

function UserRoutePage() {
  const {
    identity,
    profile,
    value,
    setValue,
    approvalCode,
    setApprovalCode,
    pairingCode,
    pairingStatus,
    feedback,
    resetFeedback,
    isSaving,
    isCreatingRemoteUser,
    isStartingPairing,
    isFindingDevice,
    isApproving,
    passkeys,
    isLoadingPasskeys,
    isRegisteringPasskey,
    isAdoptingPasskey,
    isAdopting,
    isLoggingOut,
    isConfirmingLogOut,
    setIsConfirmingLogOut,
    isClearingData,
    isConfirmingClearData,
    setIsConfirmingClearData,
    isDeletingAccount,
    isConfirmingDeleteAccount,
    setIsConfirmingDeleteAccount,
    deleteConfirmation,
    setDeleteConfirmation,
    confirmingDeviceId,
    setConfirmingDeviceId,
    forgettingDeviceId,
    setForgettingDeviceId,
    canManagePasskeys,
    passkeyAvailable,
    save,
    createRemoteAccount,
    startPairing,
    addPasskey,
    adoptWithPasskey,
    adopt,
    findDevice,
    approve,
    revoke,
    forget,
    logOut,
    clearData,
    deleteAccount,
  } = useUserManager({ isActive: true });

  const rows = useMemo<SettingsSectionRow[]>(() => {
    const sections: SettingsSectionRow[] = [];

    sections.push({
      id: "username",
      eyebrow: "username",
      subheading: "Your display name across lists",
      description:
        "Set the name attached to your list edits and items. Changes sync to all shared lists.",
      content: (
        <div>
          <form id="username-form" onSubmit={(event) => void save(event)}>
            <Input
              autoComplete="nickname"
              className="mt-1.5 h-10 font-serif text-base sm:text-sm"
              disabled={!identity || isSaving || isCreatingRemoteUser}
              id="user-username"
              maxLength={48}
              onChange={(event) => {
                setValue(event.target.value);
                resetFeedback();
              }}
              placeholder={LOCAL_IDENTITY_PLACEHOLDER}
              value={value}
            />
          </form>
          <FeedbackMessage feedback={feedback} section="username" />
        </div>
      ),
      action: (
        <Button
          className="h-10 min-w-24 px-5 text-sm"
          form="username-form"
          isDisabled={!identity || isSaving || isCreatingRemoteUser}
          type="submit"
        >
          {isSaving ? "Saving…" : "Save"}
        </Button>
      ),
    });

    if (identity && !identity.remoteUsername) {
      sections.push({
        id: "account-create",
        eyebrow: "remote account",
        subheading: "Use this user across browsers",
        description:
          "Create a remote user with this username so you can pair other browsers and publish lists without creating a list first.",
        content: <FeedbackMessage feedback={feedback} section="account" />,
        action: (
          <Button
            className="h-10 min-w-24 px-5 text-sm"
            isDisabled={isCreatingRemoteUser || isSaving}
            onPress={() => void createRemoteAccount()}
          >
            {isCreatingRemoteUser ? "Creating…" : "Create remote user"}
          </Button>
        ),
      });
    }

    if (identity && !identity.remoteUsername && passkeyAvailable) {
      sections.push({
        id: "passkey-adoption",
        eyebrow: "pair with a passkey",
        subheading: "Connect this browser without a code",
        description: "Use a saved passkey to connect this browser to your existing remote user.",
        content: <FeedbackMessage feedback={feedback} section="passkey-adoption" />,
        action: (
          <Button
            className="h-10 gap-1.5 px-5 text-sm"
            isDisabled={isAdoptingPasskey}
            onPress={() => void adoptWithPasskey()}
          >
            {isAdoptingPasskey ? "Waiting…" : "Pair with passkey"}
          </Button>
        ),
      });
    }

    if (identity && !identity.remoteUsername) {
      sections.push({
        id: "pairing",
        eyebrow: "pair a browser",
        subheading: "Use on another device",
        description:
          "Generate a pairing code in this browser and approve it from an existing accepted device.",
        content: (
          <div>
            <FeedbackMessage feedback={feedback} section="pairing" />

            {pairingCode ? (
              <div className="mt-4 border border-border bg-muted/40 p-4">
                <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                  pairing code
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.2em] break-all text-primary sm:text-3xl">
                  {pairingCode}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {pairingStatus?.status === "pending"
                    ? "Waiting for approval on your other device…"
                    : pairingStatus?.status === "approved"
                      ? "Device approved! Ready to connect."
                      : pairingStatus?.status === "expired"
                        ? "Pairing code has expired. Please create a new one."
                        : pairingStatus?.status === "missing"
                          ? "Pairing code is unavailable or expired."
                          : "Checking pairing status…"}
                </p>
                {pairingStatus?.status === "approved" ? (
                  <Button className="mt-3" isDisabled={isAdopting} onPress={() => void adopt()}>
                    <Check className="size-3.5" />
                    {isAdopting ? "Saving…" : "Use this username"}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        ),
        action: (
          <Button
            className="h-10 min-w-24 px-5 text-sm"
            isDisabled={!identity || isStartingPairing}
            onPress={() => void startPairing()}
          >
            {isStartingPairing ? "Creating…" : "Show pairing code"}
          </Button>
        ),
      });
    }

    if (identity?.remoteUsername) {
      sections.push({
        id: "approval",
        eyebrow: "approve a browser",
        subheading: "Add another device",
        description:
          "Enter the ten-character pairing code shown on another device to authorize it.",
        content: (
          <div>
            <form id="approval-form" onSubmit={(event) => void findDevice(event)}>
              <Input
                aria-label="Pairing code"
                className="h-10 max-w-48 font-mono tracking-widest uppercase"
                maxLength={10}
                onChange={(event) => setApprovalCode(event.target.value)}
                placeholder="CODE"
                spellCheck={false}
                value={approvalCode}
              />
            </form>
            <FeedbackMessage feedback={feedback} section="approval" />

            {pairingStatus?.status === "pending" && pairingStatus.code === approvalCode ? (
              <div className="mt-4 border border-border bg-muted/40 p-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="size-4 text-primary" />
                  <p className="text-sm font-medium">A new device is waiting for approval.</p>
                </div>
                <Button className="mt-3" isDisabled={isApproving} onPress={() => void approve()}>
                  <Shield className="size-3.5" />
                  {isApproving ? "Approving…" : "Approve device"}
                </Button>
              </div>
            ) : null}
          </div>
        ),
        action: (
          <Button
            className="h-10 min-w-24 px-5 text-sm"
            form="approval-form"
            isDisabled={isFindingDevice || !identity}
            type="submit"
          >
            {isFindingDevice ? "Finding…" : "Find"}
          </Button>
        ),
      });
    }

    if (profile) {
      sections.push({
        id: "devices",
        eyebrow: "accepted devices",
        subheading: "Manage devices",
        description:
          "Every active device that can sign mutations and approve other devices for this user.",
        content: (
          <div>
            <DevicesTable
              confirmingDeviceId={confirmingDeviceId}
              forgettingDeviceId={forgettingDeviceId}
              identity={identity}
              onCancelForget={() => setForgettingDeviceId(undefined)}
              onCancelRevoke={() => setConfirmingDeviceId(undefined)}
              onConfirmForget={(deviceId) => setForgettingDeviceId(deviceId)}
              onConfirmRevoke={(deviceId) => setConfirmingDeviceId(deviceId)}
              onForget={(deviceId) => void forget(deviceId)}
              onRevoke={(deviceId) => void revoke(deviceId)}
              profile={profile}
            />
            <FeedbackMessage feedback={feedback} section="devices" />
          </div>
        ),
      });
    }

    if (canManagePasskeys) {
      sections.push({
        id: "passkeys",
        eyebrow: "passkeys",
        subheading: "Sign in without pairing codes",
        description:
          "Add passkeys to this user. Each passkey can instantly adopt a new browser without generating pairing codes.",
        content: (
          <div>
            {!passkeyAvailable ? (
              <p className="text-sm text-muted-foreground">
                Passkeys are not available in this browser.
              </p>
            ) : null}
            <FeedbackMessage feedback={feedback} section="passkeys" />

            {isLoadingPasskeys ? (
              <p className="mt-4 font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                Loading passkeys…
              </p>
            ) : passkeys.length > 0 ? (
              <div className="mt-4">
                <PasskeysTable passkeys={passkeys} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No passkeys added yet.</p>
            )}
          </div>
        ),
        action: passkeyAvailable ? (
          <Button
            className="h-9 shrink-0 gap-1.5 px-3 text-sm"
            isDisabled={isRegisteringPasskey}
            onPress={() => void addPasskey()}
          >
            <KeyRound aria-hidden="true" className="size-3.5" />
            {isRegisteringPasskey ? "Waiting…" : "Add passkey"}
          </Button>
        ) : undefined,
      });
    }

    if (identity?.remoteUsername || identity?.username) {
      sections.push({
        id: "logout",
        eyebrow: "session",
        subheading: "Log out",
        description:
          "Disconnect this user identity from this browser. Lists and local data are retained.",
        content: (
          <div>
            {isConfirmingLogOut ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] tracking-[0.08em] text-destructive uppercase">
                  log out of this browser?
                </span>
                <Button
                  className="h-8 px-4 text-sm"
                  isDisabled={isLoggingOut}
                  onPress={() => void logOut()}
                  variant="destructive"
                >
                  {isLoggingOut ? "Logging out…" : "Yes, log out"}
                </Button>
                <Button
                  className="h-8 px-4 text-sm"
                  isDisabled={isLoggingOut}
                  onPress={() => setIsConfirmingLogOut(false)}
                  variant="ghost"
                >
                  Cancel
                </Button>
              </div>
            ) : null}
            <FeedbackMessage feedback={feedback} section="logout" />
          </div>
        ),
        action: isConfirmingLogOut ? undefined : (
          <Button
            className="h-10 min-w-24 px-5 text-sm"
            onPress={() => setIsConfirmingLogOut(true)}
            variant="outline"
          >
            Log out
          </Button>
        ),
      });
    }

    if (identity?.remoteUsername) {
      sections.push({
        id: "account-delete",
        eyebrow: "remote account",
        eyebrowTone: "destructive",
        subheading: "Delete user and created lists",
        description: (
          <>
            Permanently delete{" "}
            <span className="font-serif font-medium text-foreground">
              {identity.remoteUsername}
            </span>{" "}
            and every remote list created by this user. Lists only shared with this user are kept
            for their owners.
          </>
        ),
        content: (
          <div>
            {isConfirmingDeleteAccount ? (
              <div className="max-w-md space-y-3">
                <label className="text-xs font-medium" htmlFor="delete-remote-user-confirmation">
                  Type <span className="font-serif font-bold">{identity.remoteUsername}</span> to
                  confirm deletion
                </label>
                <Input
                  autoComplete="off"
                  className="h-10 font-serif text-base sm:text-sm"
                  disabled={isDeletingAccount}
                  id="delete-remote-user-confirmation"
                  onChange={(event) => {
                    setDeleteConfirmation(event.target.value);
                    resetFeedback();
                  }}
                  spellCheck={false}
                  value={deleteConfirmation}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="h-8 px-4 text-sm"
                    isDisabled={isDeletingAccount || deleteConfirmation !== identity.remoteUsername}
                    onPress={() => void deleteAccount()}
                    variant="destructive"
                  >
                    <Trash2 className="size-3.5" />
                    {isDeletingAccount ? "Deleting…" : "Delete remote user"}
                  </Button>
                  <Button
                    className="h-8 px-4 text-sm"
                    isDisabled={isDeletingAccount}
                    onPress={() => {
                      setIsConfirmingDeleteAccount(false);
                      setDeleteConfirmation("");
                    }}
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
            <FeedbackMessage feedback={feedback} section="account" />
          </div>
        ),
        action: isConfirmingDeleteAccount ? undefined : (
          <Button
            className="h-10 min-w-24 px-5 text-sm"
            onPress={() => setIsConfirmingDeleteAccount(true)}
            variant="destructive"
          >
            Delete remote user
          </Button>
        ),
      });
    }

    sections.push({
      id: "data",
      eyebrow: "local data",
      subheading: "Clear this browser",
      description:
        "Remove local lists, this browser's identity, and Keweke's stored browser data. Remote lists are not deleted.",
      content: (
        <div>
          {isConfirmingClearData ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] tracking-[0.08em] text-destructive uppercase">
                clear all local data?
              </span>
              <Button
                className="h-8 px-4 text-sm"
                isDisabled={isClearingData}
                onPress={() => void clearData()}
                variant="destructive"
              >
                <Trash2 className="size-3.5" />
                {isClearingData ? "Clearing…" : "Yes, clear"}
              </Button>
              <Button
                className="h-8 px-4 text-sm"
                isDisabled={isClearingData}
                onPress={() => setIsConfirmingClearData(false)}
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          ) : null}
          <FeedbackMessage feedback={feedback} section="data" />
        </div>
      ),
      action: isConfirmingClearData ? undefined : (
        <Button
          className="h-10 min-w-24 px-5 text-sm"
          onPress={() => setIsConfirmingClearData(true)}
          variant="destructive"
        >
          Clear data
        </Button>
      ),
    });

    return sections;
  }, [
    adopt,
    adoptWithPasskey,
    addPasskey,
    approvalCode,
    approve,
    canManagePasskeys,
    clearData,
    confirmingDeviceId,
    createRemoteAccount,
    deleteAccount,
    deleteConfirmation,
    feedback,
    findDevice,
    forget,
    forgettingDeviceId,
    identity,
    isAdopting,
    isAdoptingPasskey,
    isApproving,
    isClearingData,
    isConfirmingClearData,
    isConfirmingDeleteAccount,
    isConfirmingLogOut,
    isCreatingRemoteUser,
    isDeletingAccount,
    isFindingDevice,
    isLoadingPasskeys,
    isLoggingOut,
    isRegisteringPasskey,
    isSaving,
    isStartingPairing,
    logOut,
    passkeyAvailable,
    passkeys,
    pairingCode,
    pairingStatus,
    profile,
    resetFeedback,
    revoke,
    save,
    setApprovalCode,
    setConfirmingDeviceId,
    setDeleteConfirmation,
    setForgettingDeviceId,
    setIsConfirmingClearData,
    setIsConfirmingDeleteAccount,
    setIsConfirmingLogOut,
    setValue,
    startPairing,
    value,
  ]);

  const table = useTable({
    features: settingsTableFeatures,
    data: rows,
    columns: settingsColumns,
    getRowId: (row) => row.id,
  });

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <KewekeHeader />
      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        <div className="invoice-rule flex flex-col gap-4 border-b px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="mt-1 text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-5xl">
              User settings
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="min-w-0 sm:text-right">
              <p className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                {identity?.remoteUsername
                  ? "Remote user"
                  : identity?.username
                    ? "Local user"
                    : "Anonymous"}
              </p>
              <p className="mt-0.5 font-serif text-base font-medium text-foreground sm:text-lg">
                {identity?.username ?? "Anonymous"}
              </p>
            </div>
            {identity ? (
              <Blobatar
                alt=""
                className="size-12 shrink-0 sm:size-14"
                name={userAvatarSeed(identity.userId, identity.username)}
                size={64}
              />
            ) : null}
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow className="hover:bg-transparent" key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      className={
                        header.column.id === "setting"
                          ? "w-56 sm:w-72"
                          : settingsColumnClassName(header.column.id)
                      }
                      key={header.id}
                    >
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow className="hover:bg-transparent" key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell
                      className={`py-6 align-top ${settingsColumnClassName(cell.column.id) ?? ""}`}
                      key={cell.id}
                    >
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
