import { NextRequest, NextResponse } from "next/server";
import { consumeOAuthState } from "@/lib/oauthStateStore";
import { upsertConnector, saveSecret } from "@/lib/connectorStorage";
import { logConnectorEvent } from "@/lib/connectorLogger";
import { registerSlackMcp } from "@/lib/claudeSettingsManager";
import { getSlackOAuthConfig } from "@/lib/appConfig";
import type { SlackConnectorRecord } from "@/lib/connectorStorage";

export const runtime = "nodejs";

interface SlackOAuthResponse {
  ok: boolean;
  error?: string;
  access_token?: string;
  token_type?: string;
  authed_user?: { id: string };
  team?: { id: string; name: string };
  bot_user_id?: string;
}

function resolveAppBaseUrl(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured;

  // Use forwarded public origin when behind a proxy/tunnel.
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return req.nextUrl.origin;
}

function redirectError(appBaseUrl: string, returnTo: string | undefined): NextResponse {
  const base = returnTo ?? "/connectors";
  const url = `${base}${base.includes("?") ? "&" : "?"}provider=slack&status=error`;
  return NextResponse.redirect(new URL(url, appBaseUrl), { status: 302 });
}

function redirectSuccess(appBaseUrl: string, returnTo: string | undefined): NextResponse {
  const base = returnTo ?? "/connectors";
  const url = `${base}${base.includes("?") ? "&" : "?"}provider=slack&status=connected`;
  return NextResponse.redirect(new URL(url, appBaseUrl), { status: 302 });
}

export async function GET(req: NextRequest) {
  const appBaseUrl = resolveAppBaseUrl(req);
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const slackError = searchParams.get("error");

  // User denied the authorization
  if (slackError) {
    logConnectorEvent({
      event: "connector_oauth_callback",
      result: "failed",
      errorType: "OAUTH_ERROR",
      message: `Slack OAuth denied: ${slackError}`,
    });
    return redirectError(appBaseUrl, undefined);
  }

  if (!code || !state) {
    logConnectorEvent({
      event: "connector_oauth_callback",
      result: "failed",
      errorType: "OAUTH_ERROR",
      message: "Missing code or state parameter",
    });
    return redirectError(appBaseUrl, undefined);
  }

  // Validate state (one-time use)
  const stateRecord = await consumeOAuthState(state);
  if (!stateRecord) {
    logConnectorEvent({
      event: "connector_oauth_callback",
      result: "failed",
      errorType: "OAUTH_ERROR",
      message: "Invalid or expired OAuth state",
    });
    return redirectError(appBaseUrl, undefined);
  }

  const oauthConfig = await getSlackOAuthConfig();

  if (!oauthConfig) {
    logConnectorEvent({
      event: "connector_oauth_callback",
      result: "failed",
      errorType: "CONFIG_ERROR",
      message: "Slack OAuth credentials not configured",
    });
    return redirectError(appBaseUrl, stateRecord.returnTo);
  }

  // Exchange code for token
  let oauthData: SlackOAuthResponse;
  try {
    const params = new URLSearchParams({
      code,
      client_id: oauthConfig.clientId,
      client_secret: oauthConfig.clientSecret,
      redirect_uri: oauthConfig.redirectUri,
    });

    const res = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    oauthData = (await res.json()) as SlackOAuthResponse;
  } catch (err) {
    logConnectorEvent({
      event: "connector_oauth_callback",
      result: "failed",
      errorType: "OAUTH_ERROR",
      message: "Token exchange request failed",
    });
    console.error(
      "[connector] token exchange error:",
      err instanceof Error ? err.message : "unknown",
    );
    return redirectError(appBaseUrl, stateRecord.returnTo);
  }

  if (!oauthData.ok || !oauthData.access_token) {
    logConnectorEvent({
      event: "connector_oauth_callback",
      result: "failed",
      errorType: "AUTH_ERROR",
      message: `Slack token exchange failed: ${oauthData.error ?? "unknown"}`,
    });
    return redirectError(appBaseUrl, stateRecord.returnTo);
  }

  // Persist the connector record (reuse a stable ID per workspace if one exists)
  const connectionId = oauthData.team?.id ? `conn_slack_${oauthData.team.id}` : "conn_slack_main";

  const secretRef = await saveSecret(connectionId, oauthData.access_token);

  const record: SlackConnectorRecord = {
    id: connectionId,
    type: "slack",
    name: oauthData.team?.name ? `Slack — ${oauthData.team.name}` : "Slack",
    status: "connected",
    workspace: {
      teamId: oauthData.team?.id,
      teamName: oauthData.team?.name,
      botUserId: oauthData.bot_user_id,
    },
    mcpProfile: {
      serverName: "slack",
      transport: "stdio",
    },
    secretRef,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await upsertConnector(record);

  // Register the Slack MCP server in .claude/settings.json so Claude Code
  // automatically picks it up when spawned — no env injection required.
  await registerSlackMcp(oauthData.access_token);

  logConnectorEvent({
    event: "connector_oauth_callback",
    connectionId,
    result: "success",
  });

  return redirectSuccess(appBaseUrl, stateRecord.returnTo);
}
