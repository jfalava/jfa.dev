export function ListsPageHeader({ listCount }: { listCount: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b page-gutters py-5">
      <h1 className="type-page-title">
        <fbt desc="Heading of the page that lists all of the user's shopping lists">Your lists</fbt>
      </h1>
      <p className="text-sm text-muted-foreground">
        <fbt desc="Number of shopping lists shown next to the lists page heading">
          <fbt:plural count={listCount} many="lists" name="listCount" showCount="yes">
            list
          </fbt:plural>
        </fbt>
      </p>
    </div>
  );
}
