import type { ListCommand, ListItemHistoryEvent } from "@jfa.dev/common/lists";
import { Button } from "@jfa.dev/common/ui";
import { ArchiveRestore, CheckCheck, Flame, History, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { toast } from "sonner";

import { describeHistoryEvent, formatRelativeTime } from "@/lib/item-history";
import { getItemHistory } from "@/lib/list-repository";

const PAGE_SIZE = 50;

interface ItemHistoryDialogProps {
  isOpen: boolean;
  itemId: string;
  itemName: string;
  listId: string;
  onOpenChange: (isOpen: boolean) => void;
}

export function ItemHistoryDialog({
  isOpen,
  itemId,
  itemName,
  listId,
  onOpenChange,
}: ItemHistoryDialogProps) {
  const [events, setEvents] = useState<ListItemHistoryEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);
    void getItemHistory(listId, itemId, { limit: PAGE_SIZE })
      .then((page) => {
        if (!cancelled) {
          setEvents(page.events);
          setNextCursor(page.nextCursor);
        }
        return page;
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("History is unavailable right now.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, itemId, listId]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (isLoading || nextCursor === null) {
      return undefined;
    }

    setIsLoading(true);
    try {
      const page = await getItemHistory(listId, itemId, {
        beforeRevision: nextCursor,
        limit: PAGE_SIZE,
      });
      setEvents((current) => {
        const seenMutationIds = new Set(current.map((event) => event.mutationId));
        return [
          ...current,
          ...page.events.filter((event) => !seenMutationIds.has(event.mutationId)),
        ];
      });
      setNextCursor(page.nextCursor);
    } catch {
      toast.error("Could not load older events.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, itemId, listId, nextCursor]);

  return (
    <ModalOverlay
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      isDismissable
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Modal className="w-full max-w-md outline-none">
        <Dialog
          aria-label={`History for ${itemName}`}
          className="flex max-h-[85vh] flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl outline-none"
        >
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.12em] text-primary uppercase">
                item history
              </p>
              <h2 className="mt-1 truncate font-serif text-sm font-semibold">{itemName}</h2>
            </div>
            <Button
              aria-label="Close history"
              className="size-7 shrink-0 px-0"
              onPress={() => onOpenChange(false)}
              size="icon-sm"
              variant="ghost"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ×
              </span>
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {isLoading && events.length === 0 ? (
              <p className="py-8 text-center font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                loading history…
              </p>
            ) : events.length === 0 ? (
              <p className="py-8 text-center font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                no recorded changes yet
              </p>
            ) : (
              <ol className="divide-y divide-border">
                {events.map((event) => (
                  <HistoryEventRow event={event} key={event.id} />
                ))}
              </ol>
            )}
          </div>

          {events.length > 0 ? (
            <div className="border-t border-border px-4 py-3">
              {nextCursor !== null ? (
                <Button
                  className="w-full"
                  isDisabled={isLoading}
                  onPress={() => void loadMore()}
                  size="sm"
                  variant="outline"
                >
                  <History aria-hidden="true" className="size-3.5" />
                  {isLoading ? "Loading" : "Load older changes"}
                </Button>
              ) : (
                <p className="text-center font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
                  beginning of recorded history
                </p>
              )}
            </div>
          ) : null}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

function HistoryEventRow({ event }: { event: ListItemHistoryEvent }) {
  const actorName = event.actor?.username ?? "someone";
  const appliedAt = new Date(event.appliedAt);
  const absoluteTime = Number.isNaN(appliedAt.getTime())
    ? event.appliedAt
    : appliedAt.toLocaleString();

  return (
    <li className="flex items-start gap-3 py-3">
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground">
        <HistoryEventIcon command={event.command} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug">
          <span className="font-serif font-medium">{actorName}</span>{" "}
          <span className="text-muted-foreground">{describeHistoryEvent(event.command)}</span>
        </p>
        <p
          className="mt-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase"
          title={absoluteTime}
        >
          {formatRelativeTime(event.appliedAt)} · rev {event.revision}
        </p>
      </div>
    </li>
  );
}

function HistoryEventIcon({ command }: { command: ListCommand }) {
  const className = "size-4";
  switch (command.type) {
    case "add-item":
      return <Plus aria-hidden="true" className={className} />;
    case "update-item":
      return <Pencil aria-hidden="true" className={className} />;
    case "set-item-checked":
      return <CheckCheck aria-hidden="true" className={className} />;
    case "remove-item":
      return <Trash2 aria-hidden="true" className={className} />;
    case "restore-item":
      return <ArchiveRestore aria-hidden="true" className={className} />;
    case "purge-deleted-item":
      return <Flame aria-hidden="true" className={className} />;
    case "rename-list":
    default:
      return <History aria-hidden="true" className={className} />;
  }
}
