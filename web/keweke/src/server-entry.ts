import { listIdSchema } from "@jfa.dev/common/lists";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { env } from "cloudflare:workers";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";

export { KewekeList } from "./features/lists/server/keweke-list";
export { KewekeAliasDirectory } from "./features/lists/server/keweke-aliases";
export { KewekePairingSession } from "./features/auth/server/keweke-pairing";
export { KewekePasskeySession } from "./features/auth/server/keweke-passkey";
export { KewekeUserDirectory } from "./features/auth/server/keweke-users";

function getLiveListId(request: Request): string | null {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const lastIndex = segments.length - 1;
  if (
    segments[lastIndex] !== "live" ||
    segments[lastIndex - 2] !== "lists" ||
    segments[lastIndex - 3] !== "api"
  ) {
    return null;
  }

  try {
    const result = Schema.decodeUnknownResult(listIdSchema)(
      decodeURIComponent(segments[lastIndex - 1] ?? ""),
    );
    return Result.isSuccess(result) ? result.success : null;
  } catch {
    return null;
  }
}

export default createServerEntry({
  fetch: (request, options) => {
    const listId = getLiveListId(request);
    return listId
      ? env.KEWEKE_LISTS.getByName(listId).fetch(request)
      : handler.fetch(request, options);
  },
});
