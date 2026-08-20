export function ListsPageHeader({ listCount }: { listCount: number }) {
  return (
    <div className="invoice-rule flex flex-wrap items-end justify-between gap-4 border-b px-4 py-5 sm:px-6 lg:px-8">
      <div>
        <h1 className="mt-2 text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-6xl">
          Your lists
        </h1>
      </div>
      <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
        {listCount} saved
      </p>
    </div>
  );
}
