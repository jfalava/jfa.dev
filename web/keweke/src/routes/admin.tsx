import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@jfa.dev/common/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { RefreshCw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { KewekeHeader } from "@/app/components/keweke-header";
import {
  deleteAdminList,
  deleteAdminUser,
  getAdminOverview,
  type AdminListSummary,
  type AdminOverview,
  type AdminUserSummary,
} from "@/features/admin/server/admin";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    if (globalThis.window === undefined) {
      return;
    }
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return;
    }
    const identity = await fetch("/cdn-cgi/access/get-identity", {
      credentials: "include",
    }).catch(() => null);
    if (!identity || !identity.ok) {
      window.location.href = window.location.pathname + window.location.search;
      throw new Error("Cloudflare Access session is required");
    }
  },
  loader: async () => ({ overview: await getAdminOverview() }),
  component: AdminRoutePage,
});

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function AdminDeleteAction({
  ariaLabel,
  confirmationLabel,
  onDelete,
}: {
  ariaLabel: string;
  confirmationLabel: string;
  onDelete: () => Promise<void>;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async (): Promise<void> => {
    setIsDeleting(true);
    try {
      await onDelete();
    } catch (error) {
      setIsDeleting(false);
      console.error(error);
      toast.error("Could not delete that remote item.");
    }
  };

  if (isConfirming) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <span className="font-mono text-[10px] tracking-[0.08em] text-destructive uppercase">
          {confirmationLabel}
        </span>
        <Button
          aria-label={`Confirm ${ariaLabel}`}
          isDisabled={isDeleting}
          onPress={() => void confirmDelete()}
          size="sm"
          variant="destructive"
        >
          Yes
        </Button>
        <Button
          aria-label={`Keep ${ariaLabel.replace(/^Delete /, "")}`}
          isDisabled={isDeleting}
          onPress={() => setIsConfirming(false)}
          size="sm"
          variant="ghost"
        >
          Keep
        </Button>
      </div>
    );
  }

  return (
    <Button aria-label={ariaLabel} onPress={() => setIsConfirming(true)} size="sm" variant="ghost">
      <Trash2 aria-hidden="true" className="size-3.5 text-destructive" />
      <span className="hidden sm:inline">Delete</span>
    </Button>
  );
}

async function deleteRemoteUserFromAdmin(userId: string): Promise<void> {
  const result = await deleteAdminUser({ data: { userId } });
  if (result.status !== "deleted") {
    throw new Error("The remote user could not be deleted.");
  }
  window.location.reload();
}

async function deleteRemoteListFromAdmin(listId: string): Promise<void> {
  const result = await deleteAdminList({ data: { listId } });
  if (result.status !== "deleted") {
    throw new Error("The remote list could not be deleted.");
  }
  window.location.reload();
}

/* -------------------------------------------------------------------------
 * Users table
 * ---------------------------------------------------------------------- */

const usersTableFeatures = tableFeatures({});
const usersColumnHelper = createColumnHelper<typeof usersTableFeatures, AdminUserSummary>();

// Desktop shows one column per field (User, Devices, Created); mobile collapses
// User/Devices/Created into a single "info" column.
const USER_COLUMN_CLASSNAMES = {
  info: "sm:hidden",
  user: "hidden sm:table-cell",
  devices: "hidden sm:table-cell",
  created: "hidden sm:table-cell",
} satisfies Record<string, string>;

type UserColumnId = keyof typeof USER_COLUMN_CLASSNAMES;

function isUserColumnId(id: string): id is UserColumnId {
  return Object.hasOwn(USER_COLUMN_CLASSNAMES, id);
}

function userColumnClassName(id: string): string | undefined {
  return isUserColumnId(id) ? USER_COLUMN_CLASSNAMES[id] : undefined;
}

const usersColumns = usersColumnHelper.columns([
  usersColumnHelper.display({
    id: "info",
    header: "User",
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="font-serif text-base font-semibold tracking-tight">{row.original.username}</p>
        <p className="mt-0.5 font-mono text-[11px] break-all text-muted-foreground">
          {row.original.userId}
        </p>
        <p className="mt-1 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
          {row.original.activeDeviceCount} active · {row.original.deviceCount} devices ·{" "}
          {dateFormatter.format(new Date(row.original.createdAt))}
        </p>
      </div>
    ),
  }),
  usersColumnHelper.display({
    id: "user",
    header: "User",
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="font-serif text-base font-semibold tracking-tight">{row.original.username}</p>
        <p className="mt-0.5 font-mono text-[11px] break-all text-muted-foreground">
          {row.original.userId}
        </p>
      </div>
    ),
  }),
  usersColumnHelper.display({
    id: "devices",
    header: "Devices",
    cell: ({ row }) => (
      <span className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
        {row.original.activeDeviceCount} active · {row.original.deviceCount} total
      </span>
    ),
  }),
  usersColumnHelper.display({
    id: "created",
    header: "Created",
    cell: ({ row }) => (
      <span className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
        {dateFormatter.format(new Date(row.original.createdAt))}
      </span>
    ),
  }),
]);

function UsersTable({
  onDelete,
  users,
}: {
  onDelete: (userId: string) => Promise<void>;
  users: AdminUserSummary[];
}) {
  const table = useTable({
    features: usersTableFeatures,
    data: users,
    columns: usersColumns,
    getRowId: (row) => row.userId,
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow className="hover:bg-transparent" key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead className={userColumnClassName(header.column.id)} key={header.id}>
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </TableHead>
            ))}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell className={userColumnClassName(cell.column.id)} key={cell.id}>
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
            <TableCell className="text-right align-middle">
              <AdminDeleteAction
                ariaLabel={`Delete ${row.original.username}`}
                confirmationLabel="Delete + lists?"
                onDelete={() => onDelete(row.original.userId)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* -------------------------------------------------------------------------
 * Lists table
 * ---------------------------------------------------------------------- */

const listsTableFeatures = tableFeatures({});
const listsColumnHelper = createColumnHelper<typeof listsTableFeatures, AdminListSummary>();

// Desktop shows one column per field (List, Items, Revision, Updated, Open);
// mobile collapses List/Items/Revision/Updated into a single "info" column.
const LIST_COLUMN_CLASSNAMES = {
  info: "sm:hidden",
  list: "hidden sm:table-cell",
  items: "hidden sm:table-cell",
  revision: "hidden sm:table-cell",
  updated: "hidden sm:table-cell",
  open: "text-right",
} satisfies Record<string, string>;

type ListColumnId = keyof typeof LIST_COLUMN_CLASSNAMES;

function isListColumnId(id: string): id is ListColumnId {
  return Object.hasOwn(LIST_COLUMN_CLASSNAMES, id);
}

function listColumnClassName(id: string): string | undefined {
  return isListColumnId(id) ? LIST_COLUMN_CLASSNAMES[id] : undefined;
}

const listsColumns = listsColumnHelper.columns([
  listsColumnHelper.display({
    id: "info",
    header: "List",
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-serif text-base font-semibold tracking-tight">
          {row.original.title}
        </p>
        <p className="mt-0.5 font-mono text-[11px] break-all text-muted-foreground">
          {row.original.alias ? `${row.original.alias} · ` : ""}
          {row.original.listId}
        </p>
        <p className="mt-1 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
          {row.original.itemCount} lines · {row.original.completedCount} done · rev{" "}
          {row.original.revision} · {dateTimeFormatter.format(new Date(row.original.updatedAt))}
        </p>
      </div>
    ),
  }),
  listsColumnHelper.display({
    id: "list",
    header: "List",
    cell: ({ row }) => (
      <Link
        className="group block min-w-0"
        params={{ listId: row.original.alias ?? row.original.listId }}
        to="/$listId"
      >
        <p className="truncate font-serif text-base font-semibold tracking-tight group-hover:text-primary">
          {row.original.title}
        </p>
        <p className="mt-0.5 font-mono text-[11px] break-all text-muted-foreground">
          {row.original.alias ? `${row.original.alias} · ` : ""}
          {row.original.listId}
        </p>
      </Link>
    ),
  }),
  listsColumnHelper.display({
    id: "items",
    header: "Progress",
    cell: ({ row }) => (
      <span className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
        {row.original.itemCount} lines · {row.original.completedCount} done
      </span>
    ),
  }),
  listsColumnHelper.display({
    id: "revision",
    header: "Revision",
    cell: ({ row }) => (
      <span className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
        {row.original.revision}
      </span>
    ),
  }),
  listsColumnHelper.display({
    id: "updated",
    header: "Updated",
    cell: ({ row }) => (
      <span className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
        {dateTimeFormatter.format(new Date(row.original.updatedAt))}
      </span>
    ),
  }),
  listsColumnHelper.display({
    id: "open",
    header: "",
    cell: ({ row }) => (
      <Link
        aria-label={`Open ${row.original.title}`}
        className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground transition-colors hover:text-primary"
        params={{ listId: row.original.alias ?? row.original.listId }}
        to="/$listId"
      >
        Open →
      </Link>
    ),
  }),
]);

function ListsTable({
  lists,
  onDelete,
}: {
  lists: AdminListSummary[];
  onDelete: (listId: string) => Promise<void>;
}) {
  const table = useTable({
    features: listsTableFeatures,
    data: lists,
    columns: listsColumns,
    getRowId: (row) => row.listId,
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow className="hover:bg-transparent" key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead className={listColumnClassName(header.column.id)} key={header.id}>
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </TableHead>
            ))}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell className={listColumnClassName(cell.column.id)} key={cell.id}>
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
            <TableCell className="text-right align-middle">
              <AdminDeleteAction
                ariaLabel={`Delete ${row.original.title}`}
                confirmationLabel="Delete?"
                onDelete={() => onDelete(row.original.listId)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* -------------------------------------------------------------------------
 * Page
 * ---------------------------------------------------------------------- */

function AdminRoutePage() {
  const loaderData = Route.useLoaderData();
  const overview: AdminOverview | null = loaderData.overview;

  const users = overview?.users ?? [];
  const lists = overview?.lists ?? [];

  const countsLabel = useMemo(
    () => `${users.length} users · ${lists.length} lists`,
    [lists.length, users.length],
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <KewekeHeader />
      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        <div className="invoice-rule flex flex-col gap-4 border-b px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="mt-1 text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-5xl">
              Admin
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:justify-end">
            <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
              {countsLabel}
            </p>
            <Button
              className="h-8 gap-1.5 px-3 text-sm"
              onPress={() => window.location.reload()}
              variant="outline"
            >
              <RefreshCw aria-hidden="true" className="size-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {overview === null ? (
          <p className="border-b border-destructive/40 px-4 py-3 font-mono text-[10px] tracking-wide text-destructive uppercase sm:px-6 lg:px-8">
            Could not read the directory.
          </p>
        ) : null}

        {overview === null ? null : (
          <>
            <section aria-label="Users">
              <div className="flex items-baseline justify-between gap-4 px-4 pt-8 pb-3 sm:px-6 lg:px-8">
                <h2 className="font-mono text-[11px] font-medium tracking-[0.12em] uppercase">
                  Users
                </h2>
                <p className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                  {users.length} registered
                </p>
              </div>
              {users.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <UsersTable onDelete={deleteRemoteUserFromAdmin} users={users} />
                </div>
              ) : (
                <p className="px-4 pb-6 text-sm text-muted-foreground sm:px-6 lg:px-8">
                  No remote users yet.
                </p>
              )}
            </section>

            <section aria-label="Lists">
              <div className="flex items-baseline justify-between gap-4 border-t border-border px-4 pt-8 pb-3 sm:px-6 lg:px-8">
                <h2 className="font-mono text-[11px] font-medium tracking-[0.12em] uppercase">
                  Lists
                </h2>
                <p className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                  {lists.length} published
                </p>
              </div>
              {lists.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <ListsTable lists={lists} onDelete={deleteRemoteListFromAdmin} />
                </div>
              ) : (
                <p className="px-4 pb-6 text-sm text-muted-foreground sm:px-6 lg:px-8">
                  No remote lists yet.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
