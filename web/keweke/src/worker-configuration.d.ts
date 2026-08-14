/// <reference types="@cloudflare/workers-types" />

import type { KewekeList } from "./server/keweke-list";

declare global {
  namespace Cloudflare {
    interface Env {
      KEWEKE_LISTS: DurableObjectNamespace<KewekeList>;
    }
  }
}

export {};
