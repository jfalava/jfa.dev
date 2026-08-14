import { Link, useNavigate } from "@tanstack/react-router";
import { Check, Copy, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isUuidV7, normalizeListId } from "@/lib/list-id";
import { createListId } from "@/server/lists";

interface KewekeHeaderProps {
  listId?: string;
}

export function KewekeHeader({ listId }: KewekeHeaderProps) {
  const navigate = useNavigate();
  const [targetId, setTargetId] = useState("");
  const [error, setError] = useState<string>();
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const openList = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const nextListId = normalizeListId(targetId);
    if (!isUuidV7(nextListId)) {
      setError("Enter a valid UUID7 list id.");
      return;
    }

    setError(undefined);
    await navigate({ to: "/$listId", params: { listId: nextListId } });
  };

  const createList = async (): Promise<void> => {
    setIsCreating(true);
    const result = await createListId();
    await navigate({ to: "/$listId", params: { listId: result.listId } });
  };

  const copyShareLink = async (): Promise<void> => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <header className="catalog-header shrink-0 border-b border-border bg-background">
      <div className="flex min-h-11 items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6 lg:gap-8">
        <Link to="/" className="shrink-0 text-sm text-foreground">
          <div
            aria-label="keweke"
            className="flex min-w-0 cursor-default items-baseline gap-3 truncate lg:pr-4"
          >
            <span className="shrink-0 text-sm font-bold text-primary">
              <span className="inline tracking-wide">KEWEKE</span>
              <span className="hidden pl-0.5 text-xs tracking-tight sm:inline">by JFA</span>
            </span>
            <span className="hidden text-[11px] text-muted-foreground/75 sm:inline">/</span>
            <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">
              Yet another shopping list
            </span>
          </div>
        </Link>

        <div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-1">
          <form
            className="flex min-w-0 items-center gap-1"
            onSubmit={(event) => void openList(event)}
          >
            <label className="sr-only" htmlFor="list-id-input">
              Open list by UUID7
            </label>
            <Input
              id="list-id-input"
              aria-label="Open list by UUID7"
              className="w-32 font-mono text-[11px] sm:w-56"
              onChange={(event) => setTargetId(event.target.value)}
              placeholder="paste list UUID7"
              value={targetId}
            />
            <Button type="submit" variant="outline">
              open
            </Button>
          </form>
          {listId ? (
            <Button
              aria-label="Copy share link"
              onPress={() => void copyShareLink()}
              variant="outline"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              <span className="hidden sm:inline">{copied ? "copied" : "share"}</span>
            </Button>
          ) : null}
          <Button
            aria-label="Create new list"
            isDisabled={isCreating}
            onPress={() => void createList()}
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">new</span>
          </Button>
        </div>
      </div>
      {error ? (
        <div className="border-t border-destructive/40 bg-destructive/10 px-3 py-1.5 text-center font-mono text-[10px] tracking-wide text-destructive uppercase">
          error / {error}
        </div>
      ) : null}
    </header>
  );
}
