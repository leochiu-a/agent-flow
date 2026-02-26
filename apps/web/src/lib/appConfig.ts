/**
 * Local app configuration store.
 * Persists settings to .ai-workflows/.config.json — no server restart needed.
 * Slack OAuth app credentials are intentionally sourced from this file only,
 * so local UI-managed config behaves consistently in OSS/self-hosted mode.
 */
import fs from "fs/promises";
import path from "path";

interface AppConfig {
  slack?: {
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
  };
  jira?: {
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
  };
}

function normalizeOptionalConfigValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function getConfigPath(): string {
  return path.join(process.cwd(), ".ai-workflows", ".config.json");
}

async function readConfig(): Promise<AppConfig> {
  try {
    const raw = await fs.readFile(getConfigPath(), "utf-8");
    return JSON.parse(raw) as AppConfig;
  } catch {
    return {};
  }
}

async function writeConfig(config: AppConfig): Promise<void> {
  const configPath = getConfigPath();
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  });
}

// ---------------------------------------------------------------------------
// Slack credentials
// ---------------------------------------------------------------------------

export interface SlackOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** Returns Slack OAuth credentials from local persisted config. */
export async function getSlackOAuthConfig(): Promise<SlackOAuthConfig | null> {
  const config = await readConfig();
  const clientId = normalizeOptionalConfigValue(config.slack?.clientId);
  const clientSecret = normalizeOptionalConfigValue(config.slack?.clientSecret);
  const redirectUri = normalizeOptionalConfigValue(config.slack?.redirectUri);

  if (clientId && clientSecret && redirectUri) {
    return {
      clientId,
      clientSecret,
      redirectUri,
    };
  }

  return null;
}

export async function saveSlackOAuthConfig(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<void> {
  const config = await readConfig();
  config.slack = {
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    redirectUri: redirectUri.trim(),
  };
  await writeConfig(config);
}

export async function clearSlackOAuthConfig(): Promise<void> {
  const config = await readConfig();
  delete config.slack;
  await writeConfig(config);
}

/** Returns only non-secret fields safe to send to the client. */
export async function getSlackOAuthConfigPublic(): Promise<{
  configured: boolean;
  redirectUri?: string;
}> {
  const cfg = await getSlackOAuthConfig();
  if (!cfg) return { configured: false };
  return { configured: true, redirectUri: cfg.redirectUri };
}

// ---------------------------------------------------------------------------
// Jira credentials
// ---------------------------------------------------------------------------

export interface JiraOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** Returns Jira OAuth credentials from local persisted config. */
export async function getJiraOAuthConfig(): Promise<JiraOAuthConfig | null> {
  const config = await readConfig();
  const clientId = normalizeOptionalConfigValue(config.jira?.clientId);
  const clientSecret = normalizeOptionalConfigValue(config.jira?.clientSecret);
  const redirectUri = normalizeOptionalConfigValue(config.jira?.redirectUri);

  if (clientId && clientSecret && redirectUri) {
    return { clientId, clientSecret, redirectUri };
  }
  return null;
}

export async function saveJiraOAuthConfig(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<void> {
  const config = await readConfig();
  config.jira = {
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    redirectUri: redirectUri.trim(),
  };
  await writeConfig(config);
}

export async function clearJiraOAuthConfig(): Promise<void> {
  const config = await readConfig();
  delete config.jira;
  await writeConfig(config);
}

/** Returns only non-secret fields safe to send to the client. */
export async function getJiraOAuthConfigPublic(): Promise<{
  configured: boolean;
  redirectUri?: string;
}> {
  const cfg = await getJiraOAuthConfig();
  if (!cfg) return { configured: false };
  return { configured: true, redirectUri: cfg.redirectUri };
}
