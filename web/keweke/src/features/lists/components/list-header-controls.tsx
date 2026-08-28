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
        <h1 className="font-serif text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:text-6xl">
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
      className="mt-1 flex w-full max-w-none items-end gap-1.5"
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
        className="h-14 min-w-0 flex-1 py-1 font-serif text-4xl leading-[0.95] font-semibold tracking-tighter uppercase sm:h-20 sm:min-w-64 sm:text-6xl md:text-6xl"
        disabled={isSaving}
        maxLength={160}
        onChange={(event) => setValue(event.target.value)}
        value={value}
      />
      <Button isDisabled={isSaving} size="lg" type="submit">
        {isSaving ? "Saving" : "Save"}
      </Button>
      <Button
        isDisabled={isSaving}
        onPress={() => setIsEditing(false)}
        size="lg"
        type="button"
        variant="outline"
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
      <span className="min-w-0 truncate text-primary" title={identifier}>
        {identifier}
      </span>
      <Button
        aria-label={isCopied ? "Copied list URL" : `Copy full ${label} URL`}
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
