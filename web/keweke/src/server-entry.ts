import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

export { KewekeList } from "./server/keweke-list";
export { KewekeAliasDirectory } from "./server/keweke-aliases";

export default createServerEntry({
  fetch: (request, options) => handler.fetch(request, options),
});
