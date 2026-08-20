import type { ListIdentity } from "@jfa.dev/common/identities";
import type { ListItem } from "@jfa.dev/common/lists";
import { Button } from "@jfa.dev/common/ui";
import NumberFlow from "@number-flow/react";
import { Blobatar } from "blobatar/react";
import { ChevronDown, ChevronUp, Pencil, Plus } from "lucide-react";

import { userAvatarSeed } from "@/features/auth/lib/blobatar";
import { LOCAL_IDENTITY_PLACEHOLDER, type LocalIdentity } from "@/features/auth/lib/local-identity";

import type { ItemEditDraft, NewItemDraft } from "./list-item-types";

export function identityDisplayName(actor: ListIdentity, currentIdentity?: LocalIdentity): string {
  if (currentIdentity?.userId === actor.id) {
    const currentUsername = currentIdentity.remoteUsername ?? currentIdentity.username;
    if (currentUsername) {
      return currentUsername;
    }
  }

  return actor.username ?? LOCAL_IDENTITY_PLACEHOLDER;
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
      <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
        unsigned
      </span>
    );
  }

  const action = wasEdited ? "edited by" : "added by";
  const actorName = identityDisplayName(actor, identity);
  const createdBy = item.createdBy
    ? `Added by ${identityDisplayName(item.createdBy, identity)}`
    : undefined;
  const updatedBy = item.updatedBy
    ? `Last edited by ${identityDisplayName(item.updatedBy, identity)}`
    : undefined;
  const title = [createdBy, wasEdited ? updatedBy : undefined].filter(Boolean).join(" · ");

  return (
    <span
      aria-label={`${action} ${actorName}`}
      className="inline-flex max-w-full items-center gap-1 truncate text-[10px] tracking-[0.06em] text-muted-foreground"
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
  const isValid = Number.isInteger(draftQuantity) && draftQuantity >= 1 && draftQuantity <= 100_000;
  return (
    <QuantityStepper
      buttonClassName="size-6 p-0"
      isDisabled={!isValid}
      itemName={item.name}
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
      itemName="New item"
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
          {" ("}
          <span className="font-serif">{item.amount}</span>
          <span className="font-mono"> each)</span>
        </>
      ) : null}
    </>
  );
}

export function ItemFieldError({ id, message }: { id?: string; message: string }) {
  return (
    <span
      className="mt-1 block font-mono text-[9px] leading-tight tracking-widest text-destructive uppercase"
      id={id}
    >
      {message}
    </span>
  );
}

export function QuantityStepper({
  buttonClassName,
  isDisabled,
  itemName,
  onAdjust,
  quantity,
  size,
}: {
  buttonClassName?: string;
  isDisabled?: boolean;
  itemName: string;
  onAdjust: (nextQuantity: number) => void;
  quantity: number;
  size: "icon-sm" | "icon";
}) {
  return (
    <span className="flex flex-col">
      <Button
        aria-label={`Increase ${itemName} quantity`}
        className={buttonClassName}
        isDisabled={isDisabled || quantity >= 100_000}
        onPress={() => onAdjust(quantity + 1)}
        size={size}
        variant="ghost"
      >
        <ChevronUp />
      </Button>
      <Button
        aria-label={`Decrease ${itemName} quantity`}
        className={buttonClassName}
        isDisabled={isDisabled || quantity <= 1}
        onPress={() => onAdjust(quantity - 1)}
        size={size}
        variant="ghost"
      >
        <ChevronDown />
      </Button>
    </span>
  );
}
