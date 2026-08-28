import type { DeletedListItem, ListItem } from "@jfa.dev/common/lists";
import { Button } from "@jfa.dev/common/ui";
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
    <section className="invoice-rule border-t border-destructive/30 px-4 py-6 sm:px-6 lg:px-8">
      <div className="border-b border-border pb-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
            Item history
          </p>
          <h2 className="mt-1 text-xl leading-none font-semibold tracking-tight uppercase">
            Deleted items
          </h2>
        </div>
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
                <p className="mt-1 flex flex-wrap items-center gap-x-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
                  <ItemMeasure item={item} />
                  <span aria-hidden="true">·</span>
                  <span className="font-serif">{item.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="uppercase">Deleted</span>
                  <span>{item.deletedAt.slice(0, 10)}</span>
                  {item.deletedBy ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="uppercase">Deleted by</span>
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
                    aria-label={`Delete ${item.name} forever`}
                    isDisabled={isBusy}
                    onPress={() => {
                      setConfirmingArchiveId(undefined);
                      onPurge(item.archiveId);
                    }}
                    size="sm"
                    variant="destructive"
                  >
                    Delete forever
                  </Button>
                  <Button
                    isDisabled={isBusy}
                    onPress={() => setConfirmingArchiveId(undefined)}
                    size="sm"
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  {onShowHistory ? (
                    <Button
                      aria-label={`Show history for ${item.name}`}
                      isDisabled={isBusy}
                      onPress={() => onShowHistory(item)}
                      size="sm"
                      variant="ghost"
                    >
                      <History />
                      History
                    </Button>
                  ) : null}
                  <Button
                    aria-label={`Restore ${item.name}`}
                    isDisabled={isBusy}
                    onPress={() => onRestore(item.archiveId)}
                    size="sm"
                    variant="outline"
                  >
                    <RotateCcw />
                    Restore
                  </Button>
                  <Button
                    aria-label={`Delete ${item.name} forever`}
                    isDisabled={isBusy}
                    onPress={() => setConfirmingArchiveId(item.archiveId)}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 />
                    Delete forever
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
