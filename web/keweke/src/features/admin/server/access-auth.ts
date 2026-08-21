import { getRequest } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";

import { verifyLiveAccessAssertion } from "./access-jwt";

const ASSERTION_HEADER = "cf-access-jwt-assertion";
const AUTHORIZATION_COOKIE = "CF_Authorization";

// Server functions called from the browser do not traverse Access enforcement
// (only paths under /keweke/admin are protected), so the edge does not inject
// the assertion header on those requests. The CF_Authorization application
// token cookie is sent on same-origin calls and carries the same JWT claims.
function readCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }
  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    if (separator === -1) {
      continue;
    }
    if (pair.slice(0, separator).trim() !== name) {
      continue;
    }
    const value = pair.slice(separator + 1).trim();
    return value.length > 0 ? value : null;
  }
  return null;
}

export async function assertKewekeAdminAccess(): Promise<void> {
  const teamDomain = env.KEWEKE_ACCESS_TEAM_DOMAIN;
  const aud = env.KEWEKE_ACCESS_ADMIN_AUD;
  if (!teamDomain || !aud) {
    throw new Error("Keweke admin access is misconfigured");
  }

  const request = getRequest();
  const assertion =
    request.headers.get(ASSERTION_HEADER) ??
    readCookieValue(request.headers.get("cookie"), AUTHORIZATION_COOKIE);
  if (!assertion || !(await verifyLiveAccessAssertion(assertion, { teamDomain, aud }))) {
    throw new Error("Keweke admin access denied");
  }
}
