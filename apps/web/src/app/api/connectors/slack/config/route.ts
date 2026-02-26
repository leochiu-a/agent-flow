import { NextRequest, NextResponse } from "next/server";
import {
  getSlackOAuthConfigPublic,
  saveSlackOAuthConfig,
  clearSlackOAuthConfig,
} from "@/lib/appConfig";

export const runtime = "nodejs";

const OAUTH_CALLBACK_PATH = "/api/connectors/slack/oauth/callback";

function normalizeAndValidateRedirectUri(
  raw: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const value = raw.trim();
  if (!value) {
    return { ok: false, error: "redirectUri is required" };
  }

  // Backslashes are commonly introduced by copy/paste and become a trailing slash
  // in URL normalization, causing Slack redirect mismatch.
  if (value.includes("\\")) {
    return { ok: false, error: "redirectUri must not contain backslashes (\\)" };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: "redirectUri must be a valid absolute URL" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "redirectUri must use HTTPS" };
  }

  if (parsed.pathname !== OAUTH_CALLBACK_PATH || parsed.search || parsed.hash) {
    return {
      ok: false,
      error: `redirectUri must be exactly: https://<your-domain>${OAUTH_CALLBACK_PATH}`,
    };
  }

  return { ok: true, value: parsed.toString() };
}

/** GET — returns whether Slack OAuth is configured (no secrets returned) */
export async function GET() {
  const config = await getSlackOAuthConfigPublic();
  return NextResponse.json(config);
}

/** POST — save Slack OAuth app credentials */
export async function POST(req: NextRequest) {
  const { clientId, clientSecret, redirectUri } = (await req.json()) as {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };

  if (!clientId?.trim() || !clientSecret?.trim() || !redirectUri?.trim()) {
    return NextResponse.json(
      { error: "clientId, clientSecret and redirectUri are required" },
      { status: 400 },
    );
  }

  const redirectValidation = normalizeAndValidateRedirectUri(redirectUri);
  if (!redirectValidation.ok) {
    return NextResponse.json({ error: redirectValidation.error }, { status: 400 });
  }

  await saveSlackOAuthConfig(clientId.trim(), clientSecret.trim(), redirectValidation.value);
  return NextResponse.json({ ok: true });
}

/** DELETE — remove stored credentials */
export async function DELETE() {
  await clearSlackOAuthConfig();
  return NextResponse.json({ ok: true });
}
