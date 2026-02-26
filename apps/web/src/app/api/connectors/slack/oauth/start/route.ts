import { NextRequest, NextResponse } from "next/server";
import { createOAuthState, pruneExpiredStates } from "@/lib/oauthStateStore";
import { logConnectorEvent } from "@/lib/connectorLogger";
import { getSlackOAuthConfig } from "@/lib/appConfig";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const oauthConfig = await getSlackOAuthConfig();

  if (!oauthConfig) {
    logConnectorEvent({
      event: "connector_error",
      result: "failed",
      errorType: "CONFIG_ERROR",
      message: "Slack OAuth app credentials not configured",
    });
    return NextResponse.json({ error: "Slack OAuth app is not configured" }, { status: 500 });
  }

  const returnTo = req.nextUrl.searchParams.get("returnTo") ?? undefined;

  pruneExpiredStates().catch(() => {});

  const state = await createOAuthState(returnTo);

  logConnectorEvent({ event: "connector_oauth_start", result: "success" });

  const scopes = [
    "chat:write",
    "channels:history",
    "groups:history",
    "channels:read",
    "users:read",
  ].join(",");
  const authorizeUrl = new URL("https://slack.com/oauth/v2/authorize");
  authorizeUrl.searchParams.set("client_id", oauthConfig.clientId);
  authorizeUrl.searchParams.set("scope", scopes);
  authorizeUrl.searchParams.set("redirect_uri", oauthConfig.redirectUri);
  authorizeUrl.searchParams.set("state", state);

  return NextResponse.redirect(authorizeUrl.toString(), { status: 302 });
}
