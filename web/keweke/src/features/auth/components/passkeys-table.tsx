import type { PasskeyProfile } from "@jfa.dev/common/identities";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@jfa.dev/common/ui";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { KeyRound } from "lucide-react";
import { useMemo } from "react";

type PasskeyRow = {
  createdAt: string;
  id: string;
  index: number;
  synced: boolean;
  transports: readonly string[];
};

const passkeysTableFeatures = tableFeatures({});
const passkeysColumnHelper = createColumnHelper<typeof passkeysTableFeatures, PasskeyRow>();

function formatPasskeyDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

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

export function PasskeysTable({ passkeys }: { passkeys: PasskeyProfile[] }) {
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
