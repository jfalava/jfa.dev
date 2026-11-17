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
      className="border-b border-border bg-muted/30 page-gutters py-4"
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
              {isLoading ? (
                <fbt desc="List banner heading while this browser's local storage and identity are being set up">
                  Preparing this browser
                </fbt>
              ) : isRemote ? (
                <fbt desc="List banner heading on a shared list this browser can read but not edit">
                  Connect this browser to edit
                </fbt>
              ) : (
                <fbt desc="List banner heading on a new local list before the user has a name">
                  Your list is ready
                </fbt>
              )}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">
              {isLoading ? (
                <fbt desc="List banner text while this browser's local storage is being set up">
                  Setting up local storage. Your list will be ready in a moment.
                </fbt>
              ) : isRemote ? (
                <fbt desc="List banner text on a shared list explaining that pairing a user allows editing">
                  This shared list is readable here. Pair an approved user to add, edit, or check
                  items.
                </fbt>
              ) : (
                <fbt desc="List banner text on a new local list suggesting to add a name and publish">
                  This list is saved in this browser. Add a name to label your edits and publish it
                  when you are ready.
                </fbt>
              )}
            </p>
          </div>
        </div>
        {onAction ? (
          <Button className="shrink-0 self-start sm:self-auto" onPress={onAction} size="sm">
            {isRemote ? (
              <fbt desc="List banner button that opens pairing to connect this browser to a user">
                Pair this browser
              </fbt>
            ) : (
              <fbt desc="List banner button that opens the dialog to choose a username">
                Choose a name
              </fbt>
            )}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
