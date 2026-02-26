import { listConnectors, loadSecret, loadJiraTokenBundle } from "@/lib/connectorStorage";
import { logConnectorEvent } from "@/lib/connectorLogger";

/**
 * Load all connected connector secrets and return them as env vars.
 * Supports Slack (SLACK_BOT_TOKEN) and Jira (JIRA_SITE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN).
 * Errors are logged but non-fatal — the runner still starts without that token.
 */
export async function loadConnectorEnv(): Promise<NodeJS.ProcessEnv> {
  const connectors = await listConnectors();
  // Keep the runtime payload minimal (only connector vars), while avoiding
  // over-constraining to required framework-specific ProcessEnv keys.
  const env: Partial<NodeJS.ProcessEnv> = {};

  for (const connector of connectors) {
    if (connector.status !== "connected") continue;

    try {
      if (connector.type === "slack") {
        env["SLACK_BOT_TOKEN"] = await loadSecret(connector.id);
        logConnectorEvent({
          event: "connector_context",
          connectionId: connector.id,
          result: "success",
        });
      } else if (connector.type === "jira") {
        const bundle = await loadJiraTokenBundle(connector.id);
        env["JIRA_SITE_URL"] = connector.workspace.siteUrl;
        env["JIRA_USER_EMAIL"] = connector.workspace.email;
        env["JIRA_API_TOKEN"] = bundle.apiToken;
        logConnectorEvent({
          provider: "jira",
          event: "connector_context",
          connectionId: connector.id,
          result: "success",
        });
      }
    } catch {
      logConnectorEvent({
        provider: connector.type === "jira" ? "jira" : "slack",
        event: "connector_error",
        connectionId: connector.id,
        result: "failed",
        errorType: "RUNTIME_ERROR",
        message: "Failed to inject connector env — skipping",
      });
    }
  }

  return env as NodeJS.ProcessEnv;
}
