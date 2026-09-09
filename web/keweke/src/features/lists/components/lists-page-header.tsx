export function ListsPageHeader({ listCount }: { listCount: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b px-4 py-5 sm:px-6 lg:px-8">
      <h1 className="font-sans text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-6xl">
        Your lists
      </h1>
      <p className="text-sm text-muted-foreground">
        {listCount === 1 ? "1 list" : `${listCount} lists`}
      </p>
    </div>
  );
}
