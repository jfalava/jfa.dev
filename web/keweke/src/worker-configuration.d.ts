/// <reference types="@cloudflare/workers-types" />

import type { KewekeAliasDirectory } from "./server/keweke-aliases";
import type { KewekeList } from "./server/keweke-list";

declare global {
  namespace Cloudflare {
    interface Env {
      KEWEKE_LISTS: DurableObjectNamespace<KewekeList>;
      KEWEKE_ALIASES: DurableObjectNamespace<KewekeAliasDirectory>;
    }
  }
}

export {};
