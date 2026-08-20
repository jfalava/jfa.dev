import type { UserProfile } from "@jfa.dev/common/identities";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@jfa.dev/common/ui";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { LocalIdentity } from "@/features/auth/lib/local-identity";

type DeviceRow = {
  deviceId: string;
  isCurrent: boolean;
  isRevoked: boolean;
};

const devicesTableFeatures = tableFeatures({});
const devicesColumnHelper = createColumnHelper<typeof devicesTableFeatures, DeviceRow>();

// Desktop shows one column per field; mobile collapses the fields into one info column.
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

export function DevicesTable({
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
