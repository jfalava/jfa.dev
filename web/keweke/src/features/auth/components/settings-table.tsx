import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@jfa.dev/common/ui";
import {
  columnSizingFeature,
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { type ReactNode } from "react";

export type SettingsSectionRow = {
  action?: ReactNode;
  content: ReactNode;
  description: ReactNode;
  eyebrow: string;
  eyebrowTone?: "destructive";
  id: string;
  subheading: string;
};

const settingsTableFeatures = tableFeatures({ columnSizingFeature });
const settingsColumnHelper = createColumnHelper<typeof settingsTableFeatures, SettingsSectionRow>();
const SETTINGS_ACTION_COLUMN_SIZE = 192;

// Desktop shows Setting/Details/Action; mobile moves the action below the details content.
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

function settingsColumnGutterClassName(id: string): string | undefined {
  if (id === "setting") {
    return "pl-4 sm:pl-6 lg:pl-8";
  }
  if (id === "details") {
    return "pr-4 sm:pr-3";
  }
  if (id === "action") {
    return "pr-4 sm:pr-6 lg:pr-8";
  }
  return undefined;
}

function joinClassNames(...classNames: Array<string | undefined>): string | undefined {
  const className = classNames.filter(Boolean).join(" ");
  return className || undefined;
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
    size: SETTINGS_ACTION_COLUMN_SIZE,
    cell: ({ row }) =>
      row.original.action ? (
        <div className="w-full [&_button]:w-full">{row.original.action}</div>
      ) : null,
  }),
]);

export function SettingsTable({ rows }: { rows: SettingsSectionRow[] }) {
  const table = useTable({
    features: settingsTableFeatures,
    data: rows,
    columns: settingsColumns,
    getRowId: (row) => row.id,
  });

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow className="hover:bg-transparent" key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  className={joinClassNames(
                    header.column.id === "setting"
                      ? "w-56 sm:w-72"
                      : settingsColumnClassName(header.column.id),
                    settingsColumnGutterClassName(header.column.id),
                  )}
                  key={header.id}
                  style={
                    header.column.id === "action" ? { width: header.column.getSize() } : undefined
                  }
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
                  className={joinClassNames(
                    "py-6 align-top",
                    settingsColumnClassName(cell.column.id),
                    settingsColumnGutterClassName(cell.column.id),
                  )}
                  key={cell.id}
                  style={cell.column.id === "action" ? { width: cell.column.getSize() } : undefined}
                >
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
