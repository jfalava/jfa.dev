import { listIdSchema } from "@jfa.dev/common/lists";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { env } from "cloudflare:workers";

export { KewekeList } from "./server/keweke-list";
export { KewekeAliasDirectory } from "./server/keweke-aliases";
export { KewekePairingSession } from "./server/keweke-pairing";
export { KewekeUserDirectory } from "./server/keweke-users";

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
    const result = listIdSchema.safeParse(decodeURIComponent(segments[lastIndex - 1] ?? ""));
    return result.success ? result.data : null;
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
