import { preferenceCookies, readPreference, writePreference } from "@jfa.dev/common/preferences";
import { Button } from "@jfa.dev/common/ui";
import { fbs } from "fbtee";
import { useState, useSyncExternalStore } from "react";

const subscribeToNothing = () => () => {};

/**
 * Informational cookie notice. Keweke stores only what it needs to work and
 * nothing for third parties, so this has nothing to accept or reject: it
 * explains the storage once and stays dismissed through `jfa-cookie-notice`.
 */
export function CookieNotice() {
  // The server renders without the notice; the browser shows it after
  // hydration only when the dismissal cookie is missing.
  const isPending = useSyncExternalStore(
    subscribeToNothing,
    () => readPreference(preferenceCookies.cookieNotice) === undefined,
    () => false,
  );
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isPending || isDismissed) {
    return null;
  }

  return (
    <section
      aria-labelledby="cookie-notice-title"
      className="fixed inset-x-4 bottom-4 z-50 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg sm:right-auto sm:max-w-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold" id="cookie-notice-title">
          <fbt desc="Tongue-in-cheek title of the small notice explaining that the app only uses its own cookies">
            The legally required cookie banner
          </fbt>
        </h2>
        <Button
          aria-label={fbs(
            "Dismiss cookie notice",
            "Accessible label of the button that closes the cookie notice for good",
          )}
          className="-mt-1 -mr-1 size-7 shrink-0 px-0"
          onPress={() => {
            writePreference(preferenceCookies.cookieNotice, "dismissed");
            setIsDismissed(true);
          }}
          size="icon-sm"
          variant="ghost"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ×
          </span>
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        <fbt desc="Cookie notice body: the app has no third-party cookies and only stores what it needs in the browser">
          Keweke uses no third-party cookies, ads or tracking. It only keeps what it needs in this
          browser: your lists, your identity, and your theme and language choices.
        </fbt>
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        <fbt desc="Joke closing the cookie notice: nothing is shared, and the EU institutions in Brussels would approve">
          No data goes to third parties. (Brussels would be proud.)
        </fbt>
      </p>
    </section>
  );
}
