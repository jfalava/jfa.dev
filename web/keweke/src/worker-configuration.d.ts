/// <reference types="@cloudflare/workers-types" />

import type { KewekePairingSession } from "./features/auth/server/keweke-pairing";
import type { KewekePasskeySession } from "./features/auth/server/keweke-passkey";
import type { KewekeUserDirectory } from "./features/auth/server/keweke-users";
import type { KewekeAliasDirectory } from "./features/lists/server/keweke-aliases";
import type { KewekeList } from "./features/lists/server/keweke-list";

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
