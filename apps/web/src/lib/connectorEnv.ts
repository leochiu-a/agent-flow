import { listConnectors } from "@/lib/connectorStorage";
import { logConnectorEvent } from "@/lib/connectorLogger";
import {
  getJiraMcpEnv,
  getSlackMcpEnv,
  registerJiraMcp,
  registerSlackMcp,
  unregisterJiraMcp,
  unregisterSlackMcp,
} from "@/lib/claudeSettingsManager";

/**
 * Synchronize Claude MCP entries from connector state.
 * No connector secrets are injected into workflow process environment.
 */
export async function loadConnectorEnv(): Promise<NodeJS.ProcessEnv> {
  const connectors = await listConnectors();
  const connectedSlack = connectors.find((connector) => {
    return connector.type === "slack" && connector.status === "connected";
  });
  const connectedJira = connectors.find((connector) => {
    return connector.type === "jira" && connector.status === "connected";
  });

  // Keep MCP server registration in sync with connector state.
  try {
    if (connectedSlack?.type === "slack") {
      const slackEnv = await getSlackMcpEnv();
      const teamId = connectedSlack.workspace.teamId;

      // Ensure user-scope registration is always present before workflow run.
      if (slackEnv?.SLACK_BOT_TOKEN && teamId) {
        await registerSlackMcp({
          botToken: slackEnv.SLACK_BOT_TOKEN,
          teamId,
          channelIds: slackEnv.SLACK_CHANNEL_IDS,
        });
      }

      if (!slackEnv?.SLACK_BOT_TOKEN || !slackEnv.SLACK_TEAM_ID) {
        logConnectorEvent({
          event: "connector_error",
          connectionId: connectedSlack.id,
          result: "failed",
          errorType: "CONFIG_ERROR",
          message: "Slack MCP is not registered. Reconnect Slack to refresh token.",
        });
      }

      logConnectorEvent({
        event: "connector_context",
        connectionId: connectedSlack.id,
        result: "success",
      });
    }
    if (connectedJira?.type === "jira") {
      const jiraEnv = await getJiraMcpEnv();

      // Ensure user-scope registration is always present before workflow run.
      if (jiraEnv?.ATLASSIAN_API_TOKEN) {
        await registerJiraMcp({
          siteUrl: connectedJira.workspace.siteUrl,
          userEmail: connectedJira.workspace.email,
          apiToken: jiraEnv.ATLASSIAN_API_TOKEN,
        });
      }

      if (!jiraEnv?.ATLASSIAN_API_TOKEN) {
        logConnectorEvent({
          provider: "jira",
          event: "connector_error",
          connectionId: connectedJira.id,
          result: "failed",
          errorType: "CONFIG_ERROR",
          message: "Jira MCP is not registered. Reconnect Jira to refresh token.",
        });
      }

      logConnectorEvent({
        provider: "jira",
        event: "connector_context",
        connectionId: connectedJira.id,
        result: "success",
      });
    }

    // Only remove stale MCP entries. Creation/update happens during connect flows.
    if (!connectedSlack) {
      await unregisterSlackMcp();
    }
    if (!connectedJira) {
      await unregisterJiraMcp();
    }
  } catch {
    logConnectorEvent({
      event: "connector_error",
      result: "failed",
      errorType: "RUNTIME_ERROR",
      message: "Failed to sync MCP settings",
    });
  }

  return {} as NodeJS.ProcessEnv;
}
