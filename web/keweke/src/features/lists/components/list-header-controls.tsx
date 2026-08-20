import { Button, Input } from "@jfa.dev/common/ui";
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
        <h1 className="font-serif text-xl leading-none font-semibold tracking-tight sm:text-2xl">
          {title}
        </h1>
        <Button
          aria-label="Edit list title"
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
      className="mt-1 flex max-w-md items-center gap-1.5"
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
        List title
      </label>
      <Input
        id="list-title"
        aria-label="List title"
        className="min-w-44 flex-1 font-serif text-lg font-semibold"
        disabled={isSaving}
        maxLength={160}
        onChange={(event) => setValue(event.target.value)}
        value={value}
      />
      <Button isDisabled={isSaving} size="sm" type="submit">
        {isSaving ? "Saving" : "Save"}
      </Button>
      <Button
        isDisabled={isSaving}
        onPress={() => setIsEditing(false)}
        size="sm"
        type="button"
        variant="ghost"
      >
        Cancel
      </Button>
    </form>
  );
}

export function ListAlias({ alias, listId }: { alias: string | null; listId: string }) {
  const [showListId, setShowListId] = useState(alias === null);
  const [isCopied, setIsCopied] = useState(false);

  const identifier = showListId || alias === null ? listId : alias;
  const label = showListId || alias === null ? "ID" : "Alias";

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
    <div className="mt-2 flex max-w-full min-w-0 items-center gap-1 overflow-hidden font-mono text-[10px] tracking-[0.08em] uppercase">
      {alias ? (
        <Button
          aria-label={`Show ${showListId ? "Alias" : "ID"}`}
          className="h-7 gap-1 px-1 text-[10px] tracking-[0.08em] text-muted-foreground uppercase"
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
      <span className="min-w-0 flex-1 truncate text-primary" title={identifier}>
        {identifier}
      </span>
      <Button
        aria-label={isCopied ? "Copied list URL" : `Copy full ${label} URL`}
        className="size-7 p-0 text-primary"
        onPress={() => void copyUrl()}
        size="icon"
        variant="ghost"
      >
        {isCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </Button>
    </div>
  );
}
