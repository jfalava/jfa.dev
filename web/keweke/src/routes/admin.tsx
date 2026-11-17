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
import { fbs } from "fbtee";
import { RefreshCw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { KewekeHeader } from "@/app/components/keweke-header";
import { getLocale } from "@/app/i18n/runtime";
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

function AdminDeleteAction({
  confirmationLabel,
  onDelete,
  targetName,
}: {
  confirmationLabel: string;
  onDelete: () => Promise<void>;
  targetName: string;
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
      toast.error(
        fbs(
          "Could not delete that remote item.",
          "Toast shown on the admin page when deleting a user or list fails",
        ),
      );
    }
  };

  if (isConfirming) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <span className="type-label text-destructive">{confirmationLabel}</span>
        <Button
          aria-label={fbs(
            `Confirm Delete ${fbs.param("targetName", targetName)}`,
            "Accessible label of the admin button that confirms deleting a user or list; targetName is the username or list title",
          )}
          isDisabled={isDeleting}
          onPress={() => void confirmDelete()}
          size="sm"
          variant="destructive"
        >
          <fbt desc="Admin button that confirms deleting a user or list">Yes</fbt>
        </Button>
        <Button
          aria-label={fbs(
            `Keep ${fbs.param("targetName", targetName)}`,
            "Accessible label of the admin button that cancels deleting a user or list; targetName is the username or list title",
          )}
          isDisabled={isDeleting}
          onPress={() => setIsConfirming(false)}
          size="sm"
          variant="ghost"
        >
          <fbt desc="Admin button that cancels deleting a user or list and keeps it">Keep</fbt>
        </Button>
      </div>
    );
  }

  return (
    <Button
      aria-label={fbs(
        `Delete ${fbs.param("targetName", targetName)}`,
        "Accessible label of the admin button that starts deleting a user or list; targetName is the username or list title",
      )}
      onPress={() => setIsConfirming(true)}
      size="sm"
      variant="ghost"
    >
      <Trash2 aria-hidden="true" className="size-3.5 text-destructive" />
      <span className="hidden sm:inline">
        <fbt desc="Admin table button that starts deleting a user or list">Delete</fbt>
      </span>
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

// Built during render: column headers are translated per request.
function createUsersColumns() {
  const dateFormatter = new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium" });
  return usersColumnHelper.columns([
    usersColumnHelper.display({
      id: "info",
      header: fbs("User", "Admin users table column header for the username and user ID"),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-serif text-base font-semibold tracking-tight">
            {row.original.username}
          </p>
          <p className="mt-0.5 font-mono text-xs break-all text-muted-foreground">
            {row.original.userId}
          </p>
          <p className="mt-1 type-label text-muted-foreground">
            <fbt desc="Compact admin users table summary: active devices, all devices, and sign-up date">
              <fbt:plural
                count={row.original.activeDeviceCount}
                many="active"
                name="activeDeviceCount"
                showCount="yes"
              >
                active
              </fbt:plural>{" "}
              ·{" "}
              <fbt:plural
                count={row.original.deviceCount}
                many="devices"
                name="deviceCount"
                showCount="yes"
              >
                device
              </fbt:plural>{" "}
              ·{" "}
              <fbt:param name="createdDate">
                {dateFormatter.format(new Date(row.original.createdAt))}
              </fbt:param>
            </fbt>
          </p>
        </div>
      ),
    }),
    usersColumnHelper.display({
      id: "user",
      header: fbs("User", "Admin users table column header for the username and user ID"),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-serif text-base font-semibold tracking-tight">
            {row.original.username}
          </p>
          <p className="mt-0.5 font-mono text-xs break-all text-muted-foreground">
            {row.original.userId}
          </p>
        </div>
      ),
    }),
    usersColumnHelper.display({
      id: "devices",
      header: fbs("Devices", "Admin users table column header for the user's device counts"),
      cell: ({ row }) => (
        <span className="type-label text-muted-foreground">
          <fbt desc="Admin users table cell: number of active devices and total devices">
            <fbt:plural
              count={row.original.activeDeviceCount}
              many="active"
              name="activeDeviceCount"
              showCount="yes"
            >
              active
            </fbt:plural>{" "}
            ·{" "}
            <fbt:plural
              count={row.original.deviceCount}
              many="total"
              name="deviceCount"
              showCount="yes"
            >
              total
            </fbt:plural>
          </fbt>
        </span>
      ),
    }),
    usersColumnHelper.display({
      id: "created",
      header: fbs("Created", "Admin users table column header for the date the user signed up"),
      cell: ({ row }) => (
        <span className="type-label text-muted-foreground">
          {dateFormatter.format(new Date(row.original.createdAt))}
        </span>
      ),
    }),
  ]);
}

function UsersTable({
  onDelete,
  users,
}: {
  onDelete: (userId: string) => Promise<void>;
  users: AdminUserSummary[];
}) {
  const usersColumns = useMemo(() => createUsersColumns(), []);
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
            <TableHead className="text-right">
              <fbt desc="Admin users table column header for the delete button">Actions</fbt>
            </TableHead>
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
                confirmationLabel={fbs(
                  "Delete + lists?",
                  "Admin confirmation prompt before deleting a user together with all their lists",
                )}
                onDelete={() => onDelete(row.original.userId)}
                targetName={row.original.username}
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

// Built during render: column headers are translated per request.
function createListsColumns() {
  const dateTimeFormatter = new Intl.DateTimeFormat(getLocale(), {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return listsColumnHelper.columns([
    listsColumnHelper.display({
      id: "info",
      header: fbs("List", "Admin lists table column header for the list title and ID"),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-serif text-base font-semibold tracking-tight">
            {row.original.title}
          </p>
          <p className="mt-0.5 font-mono text-xs break-all text-muted-foreground">
            {row.original.alias ? `${row.original.alias} · ` : ""}
            {row.original.listId}
          </p>
          <p className="mt-1 type-label text-muted-foreground">
            <fbt desc="Compact admin lists table summary: item lines, purchased lines, revision number, and last update time">
              <fbt:plural
                count={row.original.itemCount}
                many="lines"
                name="itemCount"
                showCount="yes"
              >
                line
              </fbt:plural>{" "}
              ·{" "}
              <fbt:plural
                count={row.original.completedCount}
                many="done"
                name="completedCount"
                showCount="yes"
              >
                done
              </fbt:plural>{" "}
              · rev <fbt:param name="revision">{row.original.revision}</fbt:param> ·{" "}
              <fbt:param name="updatedAt">
                {dateTimeFormatter.format(new Date(row.original.updatedAt))}
              </fbt:param>
            </fbt>
          </p>
        </div>
      ),
    }),
    listsColumnHelper.display({
      id: "list",
      header: fbs("List", "Admin lists table column header for the list title and ID"),
      cell: ({ row }) => (
        <Link
          className="group block min-w-0"
          params={{ listId: row.original.alias ?? row.original.listId }}
          to="/$listId"
        >
          <p className="truncate font-serif text-base font-semibold tracking-tight group-hover:text-primary">
            {row.original.title}
          </p>
          <p className="mt-0.5 font-mono text-xs break-all text-muted-foreground">
            {row.original.alias ? `${row.original.alias} · ` : ""}
            {row.original.listId}
          </p>
        </Link>
      ),
    }),
    listsColumnHelper.display({
      id: "items",
      header: fbs("Progress", "Admin lists table column header for item and purchased counts"),
      cell: ({ row }) => (
        <span className="type-label text-muted-foreground">
          <fbt desc="Admin lists table cell: number of item lines and how many are purchased">
            <fbt:plural
              count={row.original.itemCount}
              many="lines"
              name="itemCount"
              showCount="yes"
            >
              line
            </fbt:plural>{" "}
            ·{" "}
            <fbt:plural
              count={row.original.completedCount}
              many="done"
              name="completedCount"
              showCount="yes"
            >
              done
            </fbt:plural>
          </fbt>
        </span>
      ),
    }),
    listsColumnHelper.display({
      id: "revision",
      header: fbs("Revision", "Admin lists table column header for the list's revision number"),
      cell: ({ row }) => (
        <span className="type-label text-muted-foreground">{row.original.revision}</span>
      ),
    }),
    listsColumnHelper.display({
      id: "updated",
      header: fbs("Updated", "Admin lists table column header for the last update time"),
      cell: ({ row }) => (
        <span className="type-label text-muted-foreground">
          {dateTimeFormatter.format(new Date(row.original.updatedAt))}
        </span>
      ),
    }),
    listsColumnHelper.display({
      id: "open",
      header: "",
      cell: ({ row }) => (
        <Link
          aria-label={fbs(
            `Open ${fbs.param("listTitle", row.original.title)}`,
            "Accessible label of the admin link that opens a list",
          )}
          className="inline-flex min-h-11 items-center font-mono text-xs tracking-[0.08em] text-muted-foreground transition-colors hover:text-primary md:min-h-0"
          params={{ listId: row.original.alias ?? row.original.listId }}
          to="/$listId"
        >
          <fbt desc="Admin lists table link that opens the list">Open →</fbt>
        </Link>
      ),
    }),
  ]);
}

function ListsTable({
  lists,
  onDelete,
}: {
  lists: AdminListSummary[];
  onDelete: (listId: string) => Promise<void>;
}) {
  const listsColumns = useMemo(() => createListsColumns(), []);
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
            <TableHead className="text-right">
              <fbt desc="Admin lists table column header for the delete button">Actions</fbt>
            </TableHead>
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
                confirmationLabel={fbs(
                  "Delete?",
                  "Admin confirmation prompt before deleting a list",
                )}
                onDelete={() => onDelete(row.original.listId)}
                targetName={row.original.title}
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
    () =>
      fbs(
        `${fbs.plural("user", users.length, { many: "users", name: "userCount", showCount: "yes" })} · ${fbs.plural("list", lists.length, { many: "lists", name: "listCount", showCount: "yes" })}`,
        "Admin page summary of how many remote users and published lists exist",
      ),
    [lists.length, users.length],
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <KewekeHeader />
      <main className="app-frame min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        <div className="flex flex-col gap-4 border-b page-gutters py-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <h1 className="type-page-title">
              <fbt desc="Heading of the admin page">Admin</fbt>
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:justify-end">
            <p className="text-sm text-muted-foreground">{countsLabel}</p>
            <Button
              className="h-8 gap-1.5 px-3 text-sm"
              onPress={() => window.location.reload()}
              variant="outline"
            >
              <RefreshCw aria-hidden="true" className="size-3.5" />
              <fbt desc="Admin page button that reloads the users and lists">Refresh</fbt>
            </Button>
          </div>
        </div>

        {overview === null ? (
          <p className="border-b border-destructive/40 page-gutters py-3 text-sm text-destructive">
            <fbt desc="Admin page error when the users and lists overview cannot be loaded">
              Could not read the directory.
            </fbt>
          </p>
        ) : null}

        {overview === null ? null : (
          <>
            <section aria-label={fbs("Users", "Accessible name of the admin page users section")}>
              <div className="flex items-baseline justify-between gap-4 page-gutters pt-8 pb-3">
                <h2 className="text-sm font-medium">
                  <fbt desc="Admin page heading for the users section">Users</fbt>
                </h2>
                <p className="text-sm text-muted-foreground">
                  <fbt desc="Admin page count of registered remote users">
                    <fbt:plural
                      count={users.length}
                      many="registered"
                      name="userCount"
                      showCount="yes"
                    >
                      registered
                    </fbt:plural>
                  </fbt>
                </p>
              </div>
              {users.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <UsersTable onDelete={deleteRemoteUserFromAdmin} users={users} />
                </div>
              ) : (
                <p className="page-gutters pb-6 text-sm text-muted-foreground">
                  <fbt desc="Admin page message when no remote users exist">
                    No remote users yet.
                  </fbt>
                </p>
              )}
            </section>

            <section aria-label={fbs("Lists", "Accessible name of the admin page lists section")}>
              <div className="flex items-baseline justify-between gap-4 border-t border-border page-gutters pt-8 pb-3">
                <h2 className="text-sm font-medium">
                  <fbt desc="Admin page heading for the published lists section">Lists</fbt>
                </h2>
                <p className="text-sm text-muted-foreground">
                  <fbt desc="Admin page count of published remote lists">
                    <fbt:plural
                      count={lists.length}
                      many="published"
                      name="listCount"
                      showCount="yes"
                    >
                      published
                    </fbt:plural>
                  </fbt>
                </p>
              </div>
              {lists.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <ListsTable lists={lists} onDelete={deleteRemoteListFromAdmin} />
                </div>
              ) : (
                <p className="page-gutters pb-6 text-sm text-muted-foreground">
                  <fbt desc="Admin page message when no published lists exist">
                    No remote lists yet.
                  </fbt>
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
