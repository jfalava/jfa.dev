import { Button, Input } from "@jfa.dev/common/ui";
import {
  ArrowLeftRight,
  Copy,
  FileSpreadsheet,
  History,
  Info,
  Pencil,
  RefreshCw,
  Search,
} from "lucide-react";

import { PreviewShell } from "./preview-shell";

function AvatarMock({ initial }: { initial: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[9px] font-bold text-primary"
    >
      {initial}
    </div>
  );
}

export function ListHeaderPreview() {
  return (
    <PreviewShell>
      <div className="flex flex-col">
        <div className="invoice-rule flex flex-col gap-5 border-b px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-6">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
              local list
            </p>
            <div className="mt-1 flex items-center gap-1">
              <h1 className="font-serif text-xl leading-none font-semibold tracking-tight sm:text-2xl">
                Weekend groceries
              </h1>
              <Button
                aria-label="Edit list title"
                size="icon"
                variant="ghost"
                className="size-7"
              >
                <Pencil className="size-4" />
              </Button>
            </div>
            <div className="mt-2 flex max-w-full min-w-0 items-center gap-1 overflow-hidden font-mono text-[10px] tracking-[0.08em] uppercase">
              <Button
                aria-label="Show ID"
                className="h-7 gap-1 px-1 text-[10px] tracking-[0.08em] text-muted-foreground uppercase"
                size="sm"
                variant="ghost"
              >
                Alias
                <ArrowLeftRight aria-hidden="true" className="size-2.5" />
              </Button>
              <span aria-hidden="true" className="shrink-0 text-muted-foreground">
                /
              </span>
              <span className="min-w-0 flex-1 truncate text-primary" title="weekend-groceries-a3k">
                weekend-groceries-a3k
              </span>
              <Button
                aria-label="Copy full Alias URL"
                className="size-7 p-0 text-primary"
                size="icon"
                variant="ghost"
              >
                <Copy aria-hidden="true" className="size-3.5" />
              </Button>
            </div>
          </div>
          <p className="font-mono text-[11px] tracking-[0.08em] whitespace-nowrap text-muted-foreground uppercase">
            02 open · 01 done
          </p>
        </div>

        <div className="invoice-rule border-b px-4 py-3 sm:px-6">
          <div className="flex items-center gap-1.5">
            <div className="relative min-w-0 flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Search items"
                className="w-full max-w-none pl-10 font-serif text-base sm:text-[11px]"
                placeholder="Search items"
              />
            </div>
            <Button
              aria-label="Enter spreadsheet mode"
              className="hidden shrink-0 md:inline-flex md:w-auto md:gap-1 md:px-2"
              size="icon"
              variant="ghost"
            >
              <FileSpreadsheet aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Excel Mode</span>
            </Button>
            <Button aria-label="How to add items" className="shrink-0" size="icon" variant="ghost">
              <Info aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}

export function ListAliasIdPreview() {
  return (
    <div className="not-prose my-4 grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border bg-card p-3">
        <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          alias
        </p>
        <p className="mt-1 font-mono text-sm font-medium text-primary">weekend-groceries-a3k</p>
        <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
          Friendly short code minted after you rename a local list. Used for pretty URLs like{" "}
          <span className="text-foreground">/keweke/weekend-groceries-a3k</span>.
        </p>
      </div>
      <div className="rounded-lg border bg-card p-3">
        <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          id (UUIDv7)
        </p>
        <p className="mt-1 font-mono text-sm font-medium break-all text-primary">
          0199c2f0-8a1b-7c3d-9e4f-2a1b3c4d5e6f
        </p>
        <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
          Time-sorted, globally unique. The only address the service needs — copy the URL from the
          alias/ID row.
        </p>
      </div>
    </div>
  );
}

export function DeletedItemsPreview() {
  return (
    <PreviewShell>
      <section className="border-t border-destructive/30 px-4 py-6 sm:px-6">
        <div className="border-b border-border pb-3">
          <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
            Item history
          </p>
          <h2 className="mt-1 text-xl leading-none font-semibold tracking-tight uppercase">
            Deleted items
          </h2>
        </div>
        <div className="divide-y divide-border">
          {[
            {
              name: "Tomatoes",
              meta: "6 EA · PRODUCE · Deleted · 2026-08-22 · by alice",
              archived: "0199…",
            },
            {
              name: "Bread",
              meta: "1 EA · BAKERY · Deleted · 2026-08-23 · by you",
              archived: "0199…",
            },
          ].map((row) => (
            <div className="flex flex-wrap items-center justify-between gap-3 py-4" key={row.name}>
              <div className="min-w-0">
                <p className="truncate font-serif text-sm font-medium">{row.name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
                  {row.meta} · {row.archived}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button aria-label={`Show history for ${row.name}`} size="sm" variant="ghost">
                  <History className="size-3.5" />
                  History
                </Button>
                <Button aria-label={`Restore ${row.name}`} size="sm" variant="outline">
                  Restore
                </Button>
                <Button aria-label={`Delete ${row.name} forever`} size="sm" variant="destructive">
                  Delete forever
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PreviewShell>
  );
}

export function ItemHistoryPreview() {
  return (
    <PreviewShell>
      <div className="flex max-h-[32rem] flex-col overflow-hidden rounded-lg border bg-popover text-popover-foreground">
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.12em] text-primary uppercase">
              item history
            </p>
            <h2 className="mt-1 truncate font-serif text-base font-semibold tracking-tight">
              Coffee · 1 BAG
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-destructive" />
                changed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-green-600" />
                new value
              </span>
            </div>
          </div>
          <Button
            aria-label="Close history"
            className="size-7 shrink-0 px-0"
            size="icon"
            variant="ghost"
          >
            ×
          </Button>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                  field
                </th>
                <th className="px-3 py-2 font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                  changed
                </th>
                <th className="px-3 py-2 font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                  new value
                </th>
                <th className="px-3 py-2 font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                  updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                {
                  field: "quantity",
                  before: "1",
                  after: "2",
                  actor: "alice",
                  when: "2m ago · rev 12",
                },
                {
                  field: "category",
                  before: "PANTRY",
                  after: "BEVERAGES",
                  actor: "bob",
                  when: "10m ago · rev 9",
                },
                {
                  field: "name",
                  before: "Coffee",
                  after: "Coffee — decaf",
                  actor: "alice",
                  when: "1h ago · rev 7",
                },
              ].map((r) => (
                <tr className="hover:bg-muted/30" key={r.field + r.after}>
                  <td className="px-3 py-3 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                    {r.field}
                  </td>
                  {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
                  <td className="px-3 py-3">
                    <span className="inline-flex max-w-32 items-center gap-1 rounded-sm bg-destructive/10 px-2 py-1 font-mono text-[11px] text-destructive">
                      <span className="truncate line-through">{r.before}</span>
                    </span>
                  </td>
                  {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
                  <td className="px-3 py-3">
                    <span className="inline-flex max-w-32 items-center gap-1 rounded-sm bg-green-600/10 px-2 py-1 font-mono text-[11px] text-green-700">
                      <span className="truncate">{r.after}</span>
                    </span>
                  </td>
                  {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
                  <td className="px-3 py-3">
                    <div className="min-w-28">
                      <p className="flex items-center gap-1 truncate font-serif text-xs font-medium">
                        <AvatarMock initial={r.actor.slice(0, 1).toUpperCase()} />
                        {r.actor}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] tracking-[0.06em] whitespace-nowrap text-muted-foreground uppercase">
                        {r.when}
                      </p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t px-5 py-3">
          <Button className="w-full" size="sm" variant="outline">
            <History aria-hidden="true" className="size-3.5" />
            Load older changes
          </Button>
          <p className="mt-2 text-center font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
            showing 3 of ~100 revisions
          </p>
        </div>
      </div>
    </PreviewShell>
  );
}

export function LiveDroppedPreview() {
  return (
    <div className="not-prose my-4 flex items-center gap-2 rounded-md border bg-amber-500/10 px-3 py-2.5">
      <RefreshCw aria-hidden="true" className="size-4 text-amber-600" />
      <span className="font-mono text-[11px] tracking-wide text-amber-900">
        Live updates dropped —
      </span>
      <Button size="sm" variant="outline" className="h-7 gap-1">
        <RefreshCw aria-hidden="true" className="size-3.5" />
        Reconnect
      </Button>
      <span className="font-mono text-[11px] tracking-wide text-muted-foreground">
        appears next to search when the WebSocket disconnects (remote lists only).
      </span>
    </div>
  );
}
