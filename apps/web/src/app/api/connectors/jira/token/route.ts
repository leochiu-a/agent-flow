import { NextRequest, NextResponse } from "next/server";
import { upsertConnector, saveJiraTokenBundle } from "@/lib/connectorStorage";
import { logConnectorEvent } from "@/lib/connectorLogger";
import type { JiraConnectorRecord, JiraTokenBundle } from "@/lib/connectorStorage";

export const runtime = "nodejs";

interface TokenRequest {
  siteUrl: string;
  email: string;
  apiToken: string;
  name?: string;
}

interface AtlassianMyselfResponse {
  accountId?: string;
  displayName?: string;
  emailAddress?: string;
}

function buildBasicAuth(email: string, apiToken: string): string {
  return `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`;
}

export async function POST(req: NextRequest) {
  const { siteUrl, email, apiToken, name } = (await req.json()) as TokenRequest;

  if (!siteUrl?.trim() || !email?.trim() || !apiToken?.trim()) {
    return NextResponse.json(
      { ok: false, error: "siteUrl, email, and apiToken are required" },
      { status: 400 },
    );
  }

  // Validate siteUrl format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(siteUrl.trim());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid siteUrl format" }, { status: 400 });
  }

  if (parsedUrl.protocol !== "https:") {
    return NextResponse.json({ ok: false, error: "siteUrl must use HTTPS" }, { status: 400 });
  }

  const normalizedSiteUrl = parsedUrl.origin; // strip trailing path/slash

  // Smoke test: verify credentials against Jira API
  let myself: AtlassianMyselfResponse;
  try {
    const res = await fetch(`${normalizedSiteUrl}/rest/api/3/myself`, {
      headers: {
        Authorization: buildBasicAuth(email.trim(), apiToken.trim()),
        Accept: "application/json",
      },
    });

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials — check your email and API token" },
        { status: 400 },
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Jira returned ${res.status}` },
        { status: 502 },
      );
    }

    myself = (await res.json()) as AtlassianMyselfResponse;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not reach Jira API — check siteUrl" },
      { status: 502 },
    );
  }

  if (!myself.accountId) {
    return NextResponse.json(
      { ok: false, error: "Unexpected response from Jira API" },
      { status: 502 },
    );
  }

  // Derive a stable connectionId from siteUrl
  const siteKey = normalizedSiteUrl.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9]/g, "_");
  const connectionId = `conn_jira_${siteKey}`;

  const bundle: JiraTokenBundle = {
    version: 2,
    provider: "jira",
    authMode: "manual",
    apiToken: apiToken.trim(),
  };

  const secretRef = await saveJiraTokenBundle(connectionId, bundle);

  const connectorName = name?.trim() || `Jira — ${parsedUrl.hostname}`;

  const record: JiraConnectorRecord = {
    id: connectionId,
    type: "jira",
    authMode: "manual",
    name: connectorName,
    status: "connected",
    workspace: {
      siteUrl: normalizedSiteUrl,
      email: email.trim(),
      accountId: myself.accountId,
      displayName: myself.displayName,
    },
    secretRef,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastCheckedAt: Date.now(),
  };

  await upsertConnector(record);

  logConnectorEvent({
    provider: "jira",
    event: "connector_oauth_callback",
    connectionId,
    result: "success",
    message: "manual token connected",
  });

  return NextResponse.json({
    ok: true,
    connectionId,
    workspace: {
      siteUrl: normalizedSiteUrl,
      email: email.trim(),
      accountId: myself.accountId,
      displayName: myself.displayName,
    },
  });
}
