import { Button, Input } from "@jfa.dev/common/ui";
import { fbs } from "fbtee";
import { ArrowLeftRight, Check, Copy, Pencil } from "lucide-react";
import { useState } from "react";

import { appPath } from "@/app/lib/site-paths";

export function ListTitleEditor({
  isSaving,
  onSave,
  title,
}: {
  isSaving: boolean;
  onSave: (title: string) => Promise<boolean>;
  title: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(title);

  if (!isEditing) {
    return (
      <div className="mt-1 flex items-center gap-1">
        <h1 className="type-page-title font-serif">{title}</h1>
        <Button
          aria-label={fbs(
            "Edit list title",
            "Accessible label of the button next to the list title that starts renaming the list",
          )}
          onPress={() => {
            setValue(title);
            setIsEditing(true);
          }}
          size="icon"
          variant="ghost"
        >
          <Pencil className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <form
      className="mt-1 flex w-full max-w-none items-stretch gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        const nextTitle = value.trim();
        if (!nextTitle || nextTitle === title) {
          setIsEditing(false);
          return;
        }
        void onSave(nextTitle).then((saved) => {
          if (saved) {
            setIsEditing(false);
          }
          return saved;
        });
      }}
    >
      <label className="sr-only" htmlFor="list-title">
        <fbt desc="Label of the text field for renaming a list">List title</fbt>
      </label>
      <Input
        id="list-title"
        aria-label={fbs("List title", "Label of the text field for renaming a list")}
        className="h-auto min-h-14 min-w-0 flex-1 py-1 type-page-title font-serif sm:min-h-20 sm:min-w-64"
        disabled={isSaving}
        maxLength={160}
        onChange={(event) => setValue(event.target.value)}
        value={value}
      />
      <div className="flex min-h-14 flex-col items-stretch justify-between gap-1.5 sm:min-h-20">
        <Button isDisabled={isSaving} size="lg" type="submit">
          {isSaving ? (
            <fbt desc="Button label while a new list title is being saved">Saving</fbt>
          ) : (
            <fbt desc="Button that saves a new list title">Save</fbt>
          )}
        </Button>
        <Button
          isDisabled={isSaving}
          onPress={() => setIsEditing(false)}
          size="lg"
          type="button"
          variant="outline"
        >
          <fbt desc="Button that cancels renaming a list">Cancel</fbt>
        </Button>
      </div>
    </form>
  );
}

export function ListAlias({ alias, listId }: { alias: string | null; listId: string }) {
  const [showListId, setShowListId] = useState(alias === null);
  const [isCopied, setIsCopied] = useState(false);

  const identifier = showListId || alias === null ? listId : alias;
  const isShowingId = showListId || alias === null;
  const label = isShowingId
    ? fbs("ID", "Label before a list's ID under the list title")
    : fbs(
        "Alias",
        "Label before a list's alias (a readable name used in its address) under the list title",
      );

  const copyUrl = async (): Promise<void> => {
    try {
      const url = new URL(appPath(identifier), window.location.origin).toString();
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1600);
    } catch {
      setIsCopied(false);
    }
  };

  return (
    <div className="mt-2 flex max-w-full min-w-0 items-center gap-1 overflow-hidden font-mono type-compact tracking-[0.08em] uppercase">
      {alias ? (
        <Button
          aria-label={
            showListId
              ? fbs(
                  "Show Alias",
                  "Accessible label of the button that switches from the list ID to its alias",
                )
              : fbs(
                  "Show ID",
                  "Accessible label of the button that switches from the list alias to its ID",
                )
          }
          className="h-7 gap-1 px-1 text-xs tracking-[0.08em] text-muted-foreground uppercase"
          onPress={() => {
            setShowListId((current) => !current);
            setIsCopied(false);
          }}
          size="sm"
          variant="ghost"
        >
          {label}
          <ArrowLeftRight aria-hidden="true" className="size-2.5" />
        </Button>
      ) : (
        <span className="shrink-0 text-muted-foreground">{label}</span>
      )}
      <span aria-hidden="true" className="shrink-0 text-muted-foreground">
        /
      </span>
      <span className="min-w-0 truncate text-primary" title={identifier}>
        {identifier}
      </span>
      <Button
        aria-label={
          isCopied
            ? fbs(
                "Copied list URL",
                "Accessible label of the copy-link button after the list URL was copied",
              )
            : isShowingId
              ? fbs(
                  "Copy full ID URL",
                  "Accessible label of the button that copies the list URL that uses its ID",
                )
              : fbs(
                  "Copy full Alias URL",
                  "Accessible label of the button that copies the list URL that uses its alias",
                )
        }
        className="relative -top-0.5 size-7 shrink-0 p-0 text-primary"
        onPress={() => void copyUrl()}
        size="icon"
        variant="ghost"
      >
        {isCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </Button>
    </div>
  );
}
