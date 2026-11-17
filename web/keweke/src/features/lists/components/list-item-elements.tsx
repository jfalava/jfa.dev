import type { ListIdentity } from "@jfa.dev/common/identities";
import type { ListItem } from "@jfa.dev/common/lists";
import { Button, Checkbox } from "@jfa.dev/common/ui";
import NumberFlow from "@number-flow/react";
import { Blobatar } from "blobatar/react";
import { fbs } from "fbtee";
import { ChevronDown, ChevronUp, Pencil, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { userAvatarSeed } from "@/features/auth/lib/blobatar";
import type { LocalIdentity } from "@/features/auth/lib/local-identity";
import { itemDraftProblemMessage } from "@/features/lists/components/item-draft-messages";
import type { ItemDraftProblem } from "@/features/lists/lib/item-draft";

import type { ItemEditDraft, NewItemDraft } from "./list-item-types";

export function ItemCompletionCheckbox({
  className,
  item,
  onToggle,
}: {
  className?: string;
  item: ListItem;
  onToggle: (id: string, checked: boolean) => Promise<boolean>;
}) {
  const [feedback, setFeedback] = useState<{ checked: boolean; failed: boolean }>();
  const pendingRef = useRef<{
    checked: boolean;
    sending: boolean;
    timer: ReturnType<typeof setTimeout>;
  }>(undefined);
  const onToggleRef = useRef(onToggle);
  const errorId = useId();

  useEffect(() => {
    onToggleRef.current = onToggle;
  }, [onToggle]);

  useEffect(
    () => () => {
      // Filtering or leaving the view must not discard an already accepted tap.
      pendingRef.current = undefined;
    },
    [],
  );

  const scheduleToggle = (checked: boolean): void => {
    if (pendingRef.current?.sending) {
      return;
    }
    // Repeated taps repeat the first intent instead of undoing the optimistic check.
    const nextChecked = pendingRef.current?.checked ?? checked;
    clearTimeout(pendingRef.current?.timer);
    setFeedback({ checked: nextChecked, failed: false });
    const timer = setTimeout(async () => {
      if (pendingRef.current?.timer === timer) {
        pendingRef.current = { checked: nextChecked, sending: true, timer };
      }
      const saved = await onToggleRef.current(item.id, nextChecked).catch(() => false);
      if (pendingRef.current?.timer === timer) {
        pendingRef.current = undefined;
        setFeedback(saved ? undefined : { checked: nextChecked, failed: true });
      }
    }, 300);
    pendingRef.current = { checked: nextChecked, sending: false, timer };
  };

  const failed = feedback?.failed === true;

  return (
    <Checkbox
      aria-describedby={failed ? errorId : undefined}
      aria-label={
        item.checked
          ? fbs(
              `Restore ${fbs.param("itemName", item.name)} to the list`,
              "Accessible label of the checkbox that moves a purchased shopping list item back to the open list",
            )
          : fbs(
              `Mark ${fbs.param("itemName", item.name)} as purchased`,
              "Accessible label of the checkbox that marks a shopping list item as purchased",
            )
      }
      className={className}
      isInvalid={failed}
      isSelected={feedback && !failed ? feedback.checked : item.checked}
      onChange={scheduleToggle}
    >
      {failed ? (
        <span className="sr-only" id={errorId} role="alert">
          <fbt desc="Screen reader alert shown when saving a shopping list item's purchased state fails">
            Could not save <fbt:param name="itemName">{item.name}</fbt:param>. Activate the checkbox
            to retry.
          </fbt>
        </span>
      ) : null}
    </Checkbox>
  );
}

/**
 * An item name as it appears inside a sentence the system speaks — a toast, for
 * instance. Quoted and set in the serif face so it reads as text the user wrote
 * rather than as part of the system's own message, matching how item names are
 * set everywhere else.
 */
export function QuotedItemName({ name }: { name: string }) {
  return <span className="font-serif">“{name}”</span>;
}

export function identityDisplayName(actor: ListIdentity, currentIdentity?: LocalIdentity): string {
  if (currentIdentity?.userId === actor.id) {
    const currentUsername = currentIdentity.remoteUsername ?? currentIdentity.username;
    if (currentUsername) {
      return currentUsername;
    }
  }

  return (
    actor.username ??
    fbs(
      "Your name",
      "Fallback name for the current browser's user when they have not set a username",
    )
  );
}

export function SignedItemBadge({
  identity,
  item,
}: {
  identity?: LocalIdentity;
  item: Pick<ListItem, "createdAt" | "createdBy" | "updatedAt" | "updatedBy">;
}) {
  const wasEdited =
    item.updatedAt !== item.createdAt ||
    (item.createdBy !== null && item.updatedBy !== null && item.createdBy.id !== item.updatedBy.id);
  const actor = (wasEdited ? item.updatedBy : item.createdBy) ?? item.updatedBy ?? item.createdBy;
  if (!actor) {
    return (
      <span className="type-label text-muted-foreground">
        <fbt desc="Lowercase label shown when no user is recorded as having added or edited a shopping list item">
          unsigned
        </fbt>
      </span>
    );
  }

  const actorName = identityDisplayName(actor, identity);
  const label = wasEdited
    ? fbs(
        `edited by ${fbs.param("userName", actorName)}`,
        "Accessible label of the badge naming the user who last edited a shopping list item",
      )
    : fbs(
        `added by ${fbs.param("userName", actorName)}`,
        "Accessible label of the badge naming the user who added a shopping list item",
      );
  const createdBy = item.createdBy
    ? fbs(
        `Added by ${fbs.param("userName", identityDisplayName(item.createdBy, identity))}`,
        "Tooltip on a shopping list item's signature badge naming the user who added the item",
      )
    : undefined;
  const updatedBy = item.updatedBy
    ? fbs(
        `Last edited by ${fbs.param("userName", identityDisplayName(item.updatedBy, identity))}`,
        "Tooltip on a shopping list item's signature badge naming the user who last edited the item",
      )
    : undefined;
  const title = [createdBy, wasEdited ? updatedBy : undefined].filter(Boolean).join(" · ");

  return (
    <span
      aria-label={label}
      className="inline-flex max-w-full items-center gap-1 truncate text-xs tracking-[0.06em] text-muted-foreground"
      title={title}
    >
      {wasEdited ? (
        <Pencil aria-hidden="true" className="size-3 shrink-0" />
      ) : (
        <Plus aria-hidden="true" className="size-3 shrink-0" />
      )}
      <Blobatar
        alt=""
        className="size-4 shrink-0"
        name={userAvatarSeed(actor.id, actor.username)}
        size={16}
      />
      <span className="truncate font-serif">{actorName}</span>
    </span>
  );
}

export function MobileEditQuantityStepper({
  editDraft,
  item,
  onAdjust,
}: {
  editDraft?: ItemEditDraft;
  item: ListItem;
  onAdjust: (nextQuantity: number) => void;
}) {
  const draftQuantity = Number(editDraft?.quantity ?? item.quantity);
  const minimumQuantity = item.checked ? 0 : 1;
  const isValid =
    Number.isInteger(draftQuantity) && draftQuantity >= minimumQuantity && draftQuantity <= 100_000;
  return (
    <QuantityStepper
      buttonClassName="size-6 p-0"
      isDisabled={!isValid}
      itemName={item.name}
      minimumQuantity={minimumQuantity}
      onAdjust={onAdjust}
      quantity={isValid ? draftQuantity : 1}
      size="icon-sm"
    />
  );
}

export function NewQuantityStepper({
  newItem,
  onAdjust,
}: {
  newItem: NewItemDraft;
  onAdjust: (nextQuantity: number) => void;
}) {
  const quantity = Number(newItem.quantity);
  const isValid = Number.isInteger(quantity) && quantity >= 1 && quantity <= 100_000;
  return (
    <QuantityStepper
      buttonClassName="size-6 p-0"
      isDisabled={!isValid}
      itemName={fbs(
        "New item",
        "Stands in for the item name in the quantity buttons of the add item form, as in 'Increase New item quantity'",
      )}
      onAdjust={onAdjust}
      quantity={isValid ? quantity : 1}
      size="icon-sm"
    />
  );
}

export function ItemMeasure({ item }: { item: Pick<ListItem, "quantity" | "unit" | "amount"> }) {
  return (
    <>
      <NumberFlow className="font-mono" format={{ useGrouping: false }} value={item.quantity} />{" "}
      <span className="font-serif">{item.unit}</span>
      {item.amount ? (
        <>
          {" "}
          <fbt desc="Amount per unit after a shopping list item's quantity and unit, as in '2 bags (250g each)'">
            (<fbt:param name="amountEach">
              <span className="font-serif">{item.amount}</span>
            </fbt:param>{" "}
            <span className="font-mono">each)</span>
          </fbt>
        </>
      ) : null}
    </>
  );
}

export function ItemFieldError({ id, problem }: { id?: string; problem: ItemDraftProblem }) {
  return (
    <span className="mt-1 block type-label leading-tight text-destructive" id={id}>
      {itemDraftProblemMessage(problem)}
    </span>
  );
}

export function QuantityStepper({
  buttonClassName,
  isDisabled,
  itemName,
  minimumQuantity = 1,
  onAdjust,
  quantity,
  size,
}: {
  buttonClassName?: string;
  isDisabled?: boolean;
  itemName: string;
  minimumQuantity?: number;
  onAdjust: (nextQuantity: number) => void;
  quantity: number;
  size: "icon-sm" | "icon";
}) {
  return (
    <span className="flex flex-col">
      <Button
        aria-label={fbs(
          `Increase ${fbs.param("itemName", itemName)} quantity`,
          "Accessible label of the button that raises a shopping list item's quantity by one",
        )}
        className={buttonClassName}
        isDisabled={isDisabled || quantity >= 100_000}
        onPress={() => onAdjust(quantity + 1)}
        size={size}
        variant="ghost"
      >
        <ChevronUp />
      </Button>
      <Button
        aria-label={fbs(
          `Decrease ${fbs.param("itemName", itemName)} quantity`,
          "Accessible label of the button that lowers a shopping list item's quantity by one",
        )}
        className={buttonClassName}
        isDisabled={isDisabled || quantity <= minimumQuantity}
        onPress={() => onAdjust(quantity - 1)}
        size={size}
        variant="ghost"
      >
        <ChevronDown />
      </Button>
    </span>
  );
}
