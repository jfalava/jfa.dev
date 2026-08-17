/// <reference types="@cloudflare/workers-types" />

import type { KewekeAliasDirectory } from "./server/keweke-aliases";
import type { KewekeList } from "./server/keweke-list";
import type { KewekePairingSession } from "./server/keweke-pairing";
import type { KewekePasskeySession } from "./server/keweke-passkey";
import type { KewekeUserDirectory } from "./server/keweke-users";

declare global {
  namespace Cloudflare {
    interface Env {
      KEWEKE_LISTS: DurableObjectNamespace<KewekeList>;
      KEWEKE_ALIASES: DurableObjectNamespace<KewekeAliasDirectory>;
      KEWEKE_PAIRING: DurableObjectNamespace<KewekePairingSession>;
      KEWEKE_PASSKEY_SESSIONS: DurableObjectNamespace<KewekePasskeySession>;
      KEWEKE_USERS: DurableObjectNamespace<KewekeUserDirectory>;
      KEWEKE_ACCESS_TEAM_DOMAIN?: string;
      KEWEKE_ACCESS_ADMIN_AUD?: string;
    }
  }
}

export {};
