/**
 * Manages Claude Code MCP registration using Claude's native storage format:
 *   ~/.claude.json -> mcpServers (user scope)
 *
 * We intentionally use user scope so workflow runs from different working
 * directories still have access to the same Jira/Slack MCP servers.
 */
import fs from "fs/promises";
import os from "os";
import path from "path";

interface McpServerConfig {
  type: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface ClaudeState {
  mcpServers?: Record<string, McpServerConfig>;
  [key: string]: unknown;
}

interface SlackMcpEnv {
  SLACK_BOT_TOKEN?: string;
  SLACK_TEAM_ID?: string;
  SLACK_CHANNEL_IDS?: string;
}

interface JiraMcpEnv {
  ATLASSIAN_SITE_NAME?: string;
  ATLASSIAN_USER_EMAIL?: string;
  ATLASSIAN_API_TOKEN?: string;
}

const CLAUDE_STATE_FILENAME = ".claude.json";
function getClaudeStatePath(): string {
  return path.join(os.homedir(), CLAUDE_STATE_FILENAME);
}

function getJiraSiteName(siteUrl: string): string {
  const host = new URL(siteUrl).host.toLowerCase();
  if (host.endsWith(".atlassian.net")) {
    return host.replace(/\.atlassian\.net$/, "");
  }
  return host.split(".")[0] || host;
}

async function readClaudeState(): Promise<ClaudeState> {
  try {
    const raw = await fs.readFile(getClaudeStatePath(), "utf-8");
    const parsed = JSON.parse(raw) as ClaudeState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeClaudeState(state: ClaudeState): Promise<void> {
  await fs.writeFile(getClaudeStatePath(), JSON.stringify(state, null, 2), "utf-8");
}

async function readMcpServer(
  serverName: "slack" | "jira",
  _projectPath?: string,
): Promise<McpServerConfig | null> {
  const state = await readClaudeState();
  return state.mcpServers?.[serverName] ?? null;
}

async function upsertMcpServer(
  serverName: "slack" | "jira",
  config: McpServerConfig,
  _projectPath?: string,
): Promise<void> {
  const state = await readClaudeState();
  state.mcpServers = {
    ...state.mcpServers,
    [serverName]: config,
  };

  await writeClaudeState(state);
}

async function removeMcpServer(serverName: "slack" | "jira", _projectPath?: string): Promise<void> {
  const state = await readClaudeState();
  if (state.mcpServers?.[serverName]) {
    delete state.mcpServers[serverName];
  }

  await writeClaudeState(state);
}

/** Register the Slack MCP server in ~/.claude.json user config */
export async function registerSlackMcp(
  input: {
    botToken: string;
    teamId: string;
    channelIds?: string;
  },
  projectPath?: string,
): Promise<void> {
  const env: Record<string, string> = {
    SLACK_BOT_TOKEN: input.botToken,
    SLACK_TEAM_ID: input.teamId,
  };
  if (input.channelIds?.trim()) {
    env.SLACK_CHANNEL_IDS = input.channelIds.trim();
  }

  await upsertMcpServer(
    "slack",
    {
      type: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-slack"],
      env,
    },
    projectPath,
  );
}

/** Register the Jira MCP server in ~/.claude.json user config */
export async function registerJiraMcp(
  input: {
    siteUrl: string;
    userEmail: string;
    apiToken: string;
  },
  projectPath?: string,
): Promise<void> {
  const jiraPackage = process.env.JIRA_MCP_PACKAGE?.trim() || "@aashari/mcp-server-atlassian-jira";

  await upsertMcpServer(
    "jira",
    {
      type: "stdio",
      command: "npx",
      args: ["-y", jiraPackage],
      env: {
        ATLASSIAN_SITE_NAME: getJiraSiteName(input.siteUrl),
        ATLASSIAN_USER_EMAIL: input.userEmail,
        ATLASSIAN_API_TOKEN: input.apiToken,
      },
    },
    projectPath,
  );
}

/** Remove the Slack MCP server entry from ~/.claude.json user config */
export async function unregisterSlackMcp(projectPath?: string): Promise<void> {
  await removeMcpServer("slack", projectPath);
}

/** Remove the Jira MCP server entry from ~/.claude.json user config */
export async function unregisterJiraMcp(projectPath?: string): Promise<void> {
  await removeMcpServer("jira", projectPath);
}

/** Check if Slack MCP is currently registered */
export async function isSlackMcpRegistered(projectPath?: string): Promise<boolean> {
  const server = await readMcpServer("slack", projectPath);
  return !!server;
}

export async function isJiraMcpRegistered(projectPath?: string): Promise<boolean> {
  const server = await readMcpServer("jira", projectPath);
  return !!server;
}

export async function getSlackMcpEnv(projectPath?: string): Promise<SlackMcpEnv | null> {
  const server = await readMcpServer("slack", projectPath);
  const env = server?.env;
  if (!env) return null;

  return {
    SLACK_BOT_TOKEN: env.SLACK_BOT_TOKEN,
    SLACK_TEAM_ID: env.SLACK_TEAM_ID,
    SLACK_CHANNEL_IDS: env.SLACK_CHANNEL_IDS,
  };
}

export async function getJiraMcpEnv(projectPath?: string): Promise<JiraMcpEnv | null> {
  const server = await readMcpServer("jira", projectPath);
  const env = server?.env;
  if (!env) return null;

  return {
    ATLASSIAN_SITE_NAME: env.ATLASSIAN_SITE_NAME,
    ATLASSIAN_USER_EMAIL: env.ATLASSIAN_USER_EMAIL,
    ATLASSIAN_API_TOKEN: env.ATLASSIAN_API_TOKEN,
  };
}
