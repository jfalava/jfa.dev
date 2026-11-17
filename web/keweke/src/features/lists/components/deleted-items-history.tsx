import type { DeletedListItem, ListItem } from "@jfa.dev/common/lists";
import { Button } from "@jfa.dev/common/ui";
import { fbs } from "fbtee";
import { History, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";

import type { LocalIdentity } from "@/features/auth/lib/local-identity";

import { identityDisplayName, ItemMeasure } from "./list-item-elements";

export function DeletedItemsHistory({
  busyArchiveId,
  identity,
  items,
  onPurge,
  onRestore,
  onShowHistory,
}: {
  busyArchiveId?: string;
  identity?: LocalIdentity;
  items: readonly DeletedListItem[];
  onPurge: (archiveId: string) => void;
  onRestore: (archiveId: string) => void;
  onShowHistory?: (item: Pick<ListItem, "id" | "name">) => void;
}) {
  const [confirmingArchiveId, setConfirmingArchiveId] = useState<string>();

  if (items.length === 0) {
    return null;
  }

  const historyItems = items.reduceRight<DeletedListItem[]>((reversed, item) => {
    reversed.push(item);
    return reversed;
  }, []);

  return (
    <section className="border-t page-gutters py-6">
      <div className="border-b border-border pb-3">
        <h2 className="type-section-title">
          <fbt desc="Heading of the list page section with deleted items that can be restored">
            Deleted items
          </fbt>
        </h2>
      </div>
      <div className="divide-y divide-border">
        {historyItems.map((item) => {
          const isBusy = busyArchiveId === item.archiveId;
          return (
            <div
              className="flex flex-wrap items-center justify-between gap-3 py-4"
              key={item.archiveId}
            >
              <div className="min-w-0">
                <p className="truncate font-serif text-sm font-medium">{item.name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-1 font-mono text-xs tracking-[0.08em] text-muted-foreground">
                  <ItemMeasure item={item} />
                  <span aria-hidden="true">·</span>
                  <span className="font-serif">{item.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="uppercase">
                    <fbt desc="Label before the date an item was deleted, in the deleted items section">
                      Deleted
                    </fbt>
                  </span>
                  <span>{item.deletedAt.slice(0, 10)}</span>
                  {item.deletedBy ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="uppercase">
                        <fbt desc="Label before the name of the person who deleted an item, in the deleted items section">
                          Deleted by
                        </fbt>
                      </span>
                      <span className="font-serif">
                        {identityDisplayName(item.deletedBy, identity)}
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
              {confirmingArchiveId === item.archiveId ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    aria-label={fbs(
                      `Delete ${fbs.param("itemName", item.name)} forever`,
                      "Accessible label of the button that permanently deletes an item from the deleted items section",
                    )}
                    isDisabled={isBusy}
                    onPress={() => {
                      setConfirmingArchiveId(undefined);
                      onPurge(item.archiveId);
                    }}
                    size="sm"
                    variant="destructive"
                  >
                    <fbt desc="Button that permanently deletes an item from the deleted items section">
                      Delete forever
                    </fbt>
                  </Button>
                  <Button
                    isDisabled={isBusy}
                    onPress={() => setConfirmingArchiveId(undefined)}
                    size="sm"
                    variant="ghost"
                  >
                    <fbt desc="Button that cancels permanently deleting an item">Cancel</fbt>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  {onShowHistory ? (
                    <Button
                      aria-label={fbs(
                        `Show history for ${fbs.param("itemName", item.name)}`,
                        "Accessible label of the button that opens a deleted item's change history",
                      )}
                      isDisabled={isBusy}
                      onPress={() => onShowHistory(item)}
                      size="sm"
                      variant="ghost"
                    >
                      <History />
                      <fbt desc="Button that opens a deleted item's change history">History</fbt>
                    </Button>
                  ) : null}
                  <Button
                    aria-label={fbs(
                      `Restore ${fbs.param("itemName", item.name)}`,
                      "Accessible label of the button that restores a deleted item to the list",
                    )}
                    isDisabled={isBusy}
                    onPress={() => onRestore(item.archiveId)}
                    size="sm"
                    variant="outline"
                  >
                    <RotateCcw />
                    <fbt desc="Button that restores a deleted item to the list">Restore</fbt>
                  </Button>
                  <Button
                    aria-label={fbs(
                      `Delete ${fbs.param("itemName", item.name)} forever`,
                      "Accessible label of the button that permanently deletes an item from the deleted items section",
                    )}
                    isDisabled={isBusy}
                    onPress={() => setConfirmingArchiveId(item.archiveId)}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 />
                    <fbt desc="Button that permanently deletes an item from the deleted items section">
                      Delete forever
                    </fbt>
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
