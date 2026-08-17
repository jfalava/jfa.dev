import { getRequest } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";

import { verifyLiveAccessAssertion } from "./access-jwt";

export async function assertKewekeAdminAccess(): Promise<void> {
  const teamDomain = env.KEWEKE_ACCESS_TEAM_DOMAIN;
  const aud = env.KEWEKE_ACCESS_ADMIN_AUD;
  if (!teamDomain || !aud) {
    return;
  }

  const request = getRequest();
  const assertion = request.headers.get("cf-access-jwt-assertion");
  if (!assertion || !(await verifyLiveAccessAssertion(assertion, { teamDomain, aud }))) {
    throw new Error("Keweke admin access denied");
  }
}
