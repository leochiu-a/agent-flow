/**
 * Dev / quick-start: manually provide a Slack bot token instead of going through OAuth.
 * Useful for local POC where you just want to paste an xoxb-... token directly.
 */
import { NextRequest, NextResponse } from "next/server";
import { upsertConnector, saveSecret } from "@/lib/connectorStorage";
import { registerSlackMcp } from "@/lib/claudeSettingsManager";
import { logConnectorEvent } from "@/lib/connectorLogger";
import type { SlackConnectorRecord } from "@/lib/connectorStorage";

export const runtime = "nodejs";

interface TokenRequest {
  token: string;
}

interface SlackAuthTestResponse {
  ok: boolean;
  error?: string;
  team?: string;
  team_id?: string;
  bot_id?: string;
  user_id?: string;
}

export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as TokenRequest;

  if (!token?.startsWith("xoxb-")) {
    return NextResponse.json(
      { error: "Token must be a bot token starting with xoxb-" },
      { status: 400 },
    );
  }

  // Verify the token works
  let authData: SlackAuthTestResponse;
  try {
    const res = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    authData = (await res.json()) as SlackAuthTestResponse;
  } catch {
    return NextResponse.json({ error: "Could not reach Slack API" }, { status: 502 });
  }

  if (!authData.ok) {
    return NextResponse.json(
      { error: `Invalid token: ${authData.error ?? "unknown"}` },
      { status: 400 },
    );
  }

  const connectionId = authData.team_id ? `conn_slack_${authData.team_id}` : "conn_slack_main";
  const secretRef = await saveSecret(connectionId, token);

  const record: SlackConnectorRecord = {
    id: connectionId,
    type: "slack",
    name: authData.team ? `Slack — ${authData.team}` : "Slack",
    status: "connected",
    workspace: {
      teamId: authData.team_id,
      teamName: authData.team,
      botUserId: authData.user_id,
    },
    mcpProfile: { serverName: "slack", transport: "stdio" },
    secretRef,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await upsertConnector(record);
  await registerSlackMcp(token);

  logConnectorEvent({ event: "connector_oauth_callback", connectionId, result: "success" });

  return NextResponse.json({ ok: true, connectionId, workspace: record.workspace });
}
