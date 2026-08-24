import { Button, Input, TableCell } from "@jfa.dev/common/ui";
import { Plus } from "lucide-react";

import { PreviewShell } from "./preview-shell";

export function AfterCreatePreview() {
  return (
    <PreviewShell caption="Newly created list at /keweke/:listId — title “New list”, alias pending, shopping table shows the draft row.">
      {/* Header mimics ListPageHeader */}
      <div className="invoice-rule flex flex-wrap items-end justify-between gap-4 border-b px-4 py-5">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
            local · 0199… · new
          </p>
          <h1 className="mt-1 truncate text-3xl font-semibold tracking-tighter uppercase sm:text-4xl">
            New list
          </h1>
          <p className="mt-2 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
            0 items · 0 done
          </p>
        </div>
        <span className="rounded bg-muted px-2 py-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          /keweke/0199a3b2-…
        </span>
      </div>

      {/* Shopping table preview — desktop header + new item row */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-190 border-collapse">
          <colgroup>
            <col className="w-24" />
            <col className="w-10" />
            <col />
            <col className="w-24" />
            <col className="w-20" />
            <col className="w-28" />
            <col className="w-32" />
            <col className="w-32" />
            <col className="w-24" />
            <col className="w-12" />
          </colgroup>
          <thead className="sticky top-0">
            <tr className="invoice-rule border-b-2">
              {[
                "no.",
                "",
                "item",
                "qty",
                "unit",
                "amount each",
                "category",
                "signed",
                "status",
                "",
              ].map((header) => (
                <th
                  key={header || "actions"}
                  className="h-10 bg-muted/50 px-3 text-left align-middle text-[13px] font-semibold tracking-widest text-muted-foreground uppercase first:pl-4"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <TableCell
                className="px-4 py-12 text-center font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase"
                colSpan={10}
              >
                no lines yet — add your first item
              </TableCell>
            </tr>
            <tr className="border-b-2 border-primary/20 bg-primary/5 align-top">
              <TableCell className="px-4 py-3">
                <span className="font-mono text-[11px] font-semibold text-primary">+</span>
              </TableCell>
              <TableCell className="px-3 py-3">
                <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                  new
                </span>
              </TableCell>
              <TableCell className="px-3 py-3">
                <Input
                  aria-label="New item name"
                  className="h-9 min-w-32 font-serif text-base sm:text-xs"
                  placeholder="microwave popcorn"
                  disabled
                  value=""
                  readOnly
                />
              </TableCell>
              <TableCell className="px-3 py-3">
                <div className="flex items-center gap-0.5">
                  <Input
                    aria-label="New item quantity"
                    className="h-9 w-16 text-right font-mono text-base sm:text-xs"
                    disabled
                    value="1"
                    readOnly
                  />
                  <span className="flex flex-col">
                    <Button
                      aria-label="Increase quantity"
                      size="icon-sm"
                      variant="ghost"
                      isDisabled
                      className="size-6 p-0"
                    >
                      <span className="text-[10px]">▲</span>
                    </Button>
                    <Button
                      aria-label="Decrease quantity"
                      size="icon-sm"
                      variant="ghost"
                      isDisabled
                      className="size-6 p-0"
                    >
                      <span className="text-[10px]">▼</span>
                    </Button>
                  </span>
                </div>
              </TableCell>
              <TableCell className="px-3 py-3">
                <Input
                  aria-label="New item unit"
                  className="h-9 w-20 font-serif text-base sm:text-xs"
                  placeholder="box"
                  disabled
                  value=""
                  readOnly
                />
              </TableCell>
              <TableCell className="px-3 py-3">
                <Input
                  aria-label="New item amount each"
                  className="h-9 w-28 font-serif text-base sm:text-xs"
                  placeholder="3 bags"
                  disabled
                  value=""
                  readOnly
                />
              </TableCell>
              <TableCell className="px-3 py-3">
                <Input
                  aria-label="New item category"
                  className="h-9 w-28 font-serif text-base sm:text-[10px]"
                  disabled
                  value="GENERAL"
                  readOnly
                />
              </TableCell>
              <TableCell className="px-3 py-3">
                <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                  draft
                </span>
              </TableCell>
              <TableCell className="px-3 py-3">
                <span className="font-mono text-[10px] tracking-[0.08em] text-primary uppercase">
                  open
                </span>
              </TableCell>
              <TableCell className="px-3 py-3">
                <Button aria-label="Add item" size="icon-sm" isDisabled>
                  <Plus />
                </Button>
              </TableCell>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile fallback */}
      <div className="px-4 py-6 md:hidden">
        <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
          <p className="font-mono text-[10px] font-semibold tracking-[0.08em] text-primary uppercase">
            new
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Input
              placeholder="microwave popcorn"
              aria-label="New item name"
              disabled
              value=""
              readOnly
            />
            <div className="flex gap-1">
              <Input
                className="w-16 text-right font-mono"
                value="1"
                aria-label="quantity"
                disabled
                readOnly
              />
              <Input
                placeholder="box"
                aria-label="unit"
                disabled
                value=""
                className="flex-1"
                readOnly
              />
              <Input
                placeholder="3 bags"
                aria-label="amount"
                disabled
                value=""
                className="flex-1"
                readOnly
              />
            </div>
            <Input value="GENERAL" aria-label="category" disabled readOnly />
            <Button aria-label="Add item" isDisabled className="h-11 w-full">
              <Plus /> Add item
            </Button>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}
