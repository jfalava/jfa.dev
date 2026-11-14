export function ListsPageHeader({ listCount }: { listCount: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b page-gutters py-5">
      <h1 className="type-page-title">Your lists</h1>
      <p className="text-sm text-muted-foreground">
        {listCount === 1 ? "1 list" : `${listCount} lists`}
      </p>
    </div>
  );
}
