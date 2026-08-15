import type { ListBackend } from "@jfa.dev/common/lists";
import { Button } from "@jfa.dev/common/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, CircleHelp, CloudUpload, Copy, Plus } from "lucide-react";
import { useState } from "react";

import { OpenListCommand } from "@/components/open-list-command";
import { ThemeToggle } from "@/components/theme-toggle";
import { createLocalList } from "@/lib/local-list-store";

interface KewekeHeaderProps {
  listId?: string;
  backend?: ListBackend;
  isMigrating?: boolean;
  onMigrate?: () => void;
  hideMobileNewListButton?: boolean;
}

export function KewekeHeader({
  backend,
  hideMobileNewListButton = false,
  isMigrating,
  listId,
  onMigrate,
}: KewekeHeaderProps) {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const createList = async (): Promise<void> => {
    setIsCreating(true);
    try {
      const result = await createLocalList();
      await navigate({ to: "/$listId", params: { listId: result.id } });
    } finally {
      setIsCreating(false);
    }
  };

  const copyShareLink = async (): Promise<void> => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <header className="catalog-header sticky top-0 z-30 shrink-0 border-b border-border bg-background">
      <div className="flex min-h-11 items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6 lg:gap-8 lg:px-8">
        <Link to="/" className="min-w-0 text-sm text-foreground">
          <div
            aria-label="keweke"
            className="flex min-w-0 cursor-default items-baseline gap-3 truncate lg:pr-4"
          >
            <span className="shrink-0 text-sm font-bold text-primary">
              <span className="inline tracking-wide">/KEWEKE</span>
              <span className="hidden pl-0.5 text-xs tracking-tight sm:inline">by JFA</span>
            </span>
            <span className="hidden text-[11px] text-muted-foreground/75 sm:inline">/</span>
            <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">
              Yet another shopping list
            </span>
          </div>
        </Link>

        <nav className="flex shrink-0 items-center gap-1" aria-label="General navigation">
          <OpenListCommand />
          <Link
            aria-label="Help"
            className="inline-flex size-7 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
            title="Help"
            to="/help"
          >
            <CircleHelp className="size-3.5" />
          </Link>
          <ThemeToggle />
          {backend === "local" && onMigrate ? (
            <Button
              aria-label="Publish list to a remote list"
              className="inline-flex w-7 sm:w-auto sm:gap-1 sm:px-2"
              isDisabled={isMigrating}
              onPress={onMigrate}
              size="icon"
              variant="outline"
            >
              <CloudUpload className="size-3.5" />
              <span className="hidden sm:inline">{isMigrating ? "Publishing" : "Publish"}</span>
            </Button>
          ) : null}
          {listId && backend === "remote" ? (
            <Button
              aria-label="Copy share link"
              className="hidden h-7 min-w-0 sm:inline-flex"
              onPress={() => void copyShareLink()}
              variant="outline"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Share"}</span>
            </Button>
          ) : null}
          <Button
            aria-label="Create new list"
            className={`${hideMobileNewListButton ? "hidden sm:inline-flex" : "inline-flex"} w-7 sm:w-auto sm:gap-1 sm:px-2`}
            isDisabled={isCreating}
            onPress={() => void createList()}
            size="icon"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">New list</span>
          </Button>
        </nav>
      </div>
    </header>
  );
}
