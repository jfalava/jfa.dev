import { fbs } from "fbtee";

import type { ListView } from "@/features/lists/lib/list-view";

const tabs: readonly { id: ListView }[] = [{ id: "list" }, { id: "inventory" }];

function tabLabel(view: ListView): string {
  return view === "list"
    ? fbs("List", "List page tab showing the items still to buy")
    : fbs("Inventory", "List page tab showing the checked-off items the user already has");
}

export const LIST_VIEW_PANEL_ID = "list-view-panel";

export function ListViewTabs({
  view,
  onChange,
}: {
  view: ListView;
  onChange: (view: ListView) => void;
}) {
  const moveTab = (currentIndex: number, direction: -1 | 1): void => {
    const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    if (nextTab) {
      onChange(nextTab.id);
    }
  };

  return (
    <div className="border-b page-gutters">
      <div
        aria-label={fbs(
          "List views",
          "Accessible label of the List and Inventory tabs on a list page",
        )}
        className="flex items-center gap-1"
        role="tablist"
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === view;
          return (
            <button
              aria-controls={LIST_VIEW_PANEL_ID}
              aria-selected={isActive}
              className={`ui-button density-auto relative h-9 rounded-none px-2 text-xs font-medium ${
                isActive
                  ? "text-foreground after:absolute after:right-0 after:bottom-[-1px] after:left-0 after:h-0.5 after:bg-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              id={`list-view-tab-${tab.id}`}
              key={tab.id}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                  event.preventDefault();
                  moveTab(index, event.key === "ArrowRight" ? 1 : -1);
                }
              }}
              onClick={() => onChange(tab.id)}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              type="button"
            >
              {tabLabel(tab.id)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
