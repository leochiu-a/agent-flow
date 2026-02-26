import { listConnectors, loadSecret } from "@/lib/connectorStorage";
import { logConnectorEvent } from "@/lib/connectorLogger";

/**
 * Load all connected connector secrets and return them as env vars.
 * Currently supports Slack (SLACK_BOT_TOKEN).
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
      }
    } catch {
      logConnectorEvent({
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
