import { Button } from "@jfa.dev/common/ui";
import { Cloud, LoaderCircle, UserRound } from "lucide-react";

export function ListIdentityCallout({
  kind,
  onAction,
}: {
  kind: "loading" | "local" | "remote";
  onAction?: () => void;
}) {
  const isRemote = kind === "remote";
  const isLoading = kind === "loading";

  return (
    <section
      aria-labelledby="list-identity-callout-heading"
      className="border-b border-border bg-muted/30 px-4 py-4 sm:px-6 lg:px-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 shrink-0 border border-border bg-background p-2 text-primary">
            {isLoading ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : isRemote ? (
              <Cloud aria-hidden="true" className="size-4" />
            ) : (
              <UserRound aria-hidden="true" className="size-4" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold" id="list-identity-callout-heading">
              {isLoading
                ? "Preparing this browser"
                : isRemote
                  ? "Connect this browser to edit"
                  : "Your list is ready"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">
              {isLoading
                ? "Setting up local storage. Your list will be ready in a moment."
                : isRemote
                  ? "This shared list is readable here. Pair an approved user to add, edit, or check items."
                  : "This list is saved in this browser. Add a name to label your edits and publish it when you are ready."}
            </p>
          </div>
        </div>
        {onAction ? (
          <Button className="shrink-0 self-start sm:self-auto" onPress={onAction} size="sm">
            {isRemote ? "Pair this browser" : "Choose a name"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
