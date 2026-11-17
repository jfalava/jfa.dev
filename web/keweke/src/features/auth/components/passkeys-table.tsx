import type { PasskeyProfile } from "@jfa.dev/common/identities";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@jfa.dev/common/ui";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { fbs } from "fbtee";
import { KeyRound } from "lucide-react";
import { useMemo } from "react";

import { getLocale } from "@/app/i18n/runtime";

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
  return new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium" }).format(new Date(value));
}

function createPasskeysColumns() {
  return passkeysColumnHelper.columns([
    passkeysColumnHelper.display({
      id: "passkey",
      header: fbs("Passkey", "Column header in the passkeys table for the passkey's name"),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center border border-border bg-muted/40 text-primary">
            <KeyRound aria-hidden="true" className="size-4" />
          </div>
          <p className="text-sm font-medium">
            <fbt desc="Name of a passkey in the passkeys table, numbered by position">
              Passkey <fbt:param name="passkeyNumber">{row.original.index + 1}</fbt:param>
            </fbt>
          </p>
        </div>
      ),
    }),
    passkeysColumnHelper.display({
      id: "added",
      header: fbs("Added", "Column header in the passkeys table for the date a passkey was added"),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatPasskeyDate(row.original.createdAt)}
        </span>
      ),
    }),
    passkeysColumnHelper.display({
      id: "sync",
      header: fbs(
        "Sync",
        "Column header in the passkeys table for whether a passkey syncs across devices",
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.synced ? (
            <fbt desc="Passkeys table status for a passkey that the password manager can sync to other devices">
              Available to sync
            </fbt>
          ) : (
            <fbt desc="Passkeys table status for a passkey stored only on one device">
              Device-bound
            </fbt>
          )}
          {row.original.transports.length > 0 ? ` · ${row.original.transports.join(", ")}` : ""}
        </span>
      ),
    }),
  ]);
}

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
  const columns = useMemo(() => createPasskeysColumns(), []);
  const table = useTable({
    features: passkeysTableFeatures,
    data: rows,
    columns,
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
