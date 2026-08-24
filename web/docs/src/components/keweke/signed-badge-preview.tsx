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

export function SignedBadgePreview() {
  return (
    <PreviewShell caption="SignedItemBadge as rendered in the shopping table (sheet & signed columns). Real app uses Blobatar + Pencil/Plus; docs mock uses initials to avoid extra deps. Title shows provenance.">
      <div className="overflow-x-auto p-4">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                item
              </th>
              <th className="px-3 py-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                qty
              </th>
              <th className="px-3 py-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                signed
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="px-3 py-3 font-serif text-sm">Bread</td>
              <td className="px-3 py-3 font-mono text-xs">1 EA</td>
              <td className="px-3 py-3">
                <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                  unsigned
                </span>
              </td>
            </tr>
            <tr>
              <td className="px-3 py-3 font-serif text-sm">Milk</td>
              <td className="px-3 py-3 font-mono text-xs">2 EA</td>
              <td className="px-3 py-3">
                <span
                  className="inline-flex max-w-full items-center gap-1 truncate text-[10px] tracking-[0.06em] text-muted-foreground"
                  title="Added by alice"
                >
                  <span aria-hidden="true" className="size-3">
                    ＋
                  </span>
                  <AvatarMock initial="A" />
                  <span className="truncate font-serif">alice</span>
                </span>
              </td>
            </tr>
            <tr>
              <td className="px-3 py-3 font-serif text-sm">Coffee · edited</td>
              <td className="px-3 py-3 font-mono text-xs">1 BAG</td>
              <td className="px-3 py-3">
                <span
                  className="inline-flex max-w-full items-center gap-1 truncate text-[10px] tracking-[0.06em] text-muted-foreground"
                  title="Added by alice · Last edited by bob"
                >
                  <span aria-hidden="true" className="size-3">
                    ✎
                  </span>
                  <AvatarMock initial="B" />
                  <span className="truncate font-serif">bob</span>
                </span>
              </td>
            </tr>
            <tr>
              <td className="px-3 py-3 font-serif text-sm">Tomatoes</td>
              <td className="px-3 py-3 font-mono text-xs">6 EA</td>
              <td className="px-3 py-3">
                <span
                  className="inline-flex max-w-full items-center gap-1 truncate text-[10px] tracking-[0.06em] text-muted-foreground"
                  title="Added by Your username"
                >
                  <span aria-hidden="true" className="size-3">
                    ＋
                  </span>
                  <AvatarMock initial="Y" />
                  <span className="truncate font-serif">Your username</span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
          Logic: web/keweke/src/features/lists/components/list-item-elements.tsx:24 — wasEdited =
          updatedAt≠createdAt or createdBy≠updatedBy. identityDisplayName() prefers
          currentIdentity.remoteUsername ?? username when actor.id === local userId.
        </p>
      </div>
    </PreviewShell>
  );
}

export function HeaderUserButtonPreview() {
  return (
    <div className="not-prose my-4 flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2.5">
      <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1">
        <span
          aria-hidden="true"
          className="flex size-5 items-center justify-center rounded-full bg-primary/15 font-mono text-[10px] font-bold text-primary"
        >
          U
        </span>
        <span className="font-mono text-[11px] tracking-wide">User</span>
      </div>
      <span className="font-mono text-[11px] tracking-wide text-muted-foreground">
        in KewekeHeader — opens the device identity dialog. Docs header has its own SiteHeader
        (activePackagePath=&quot;/docs&quot;) and never reuses Keweke&apos;s dropdown.
      </span>
    </div>
  );
}
