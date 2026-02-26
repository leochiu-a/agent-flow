/**
 * Manages the project-level .claude/settings.json so that Claude Code
 * automatically picks up MCP server configs when spawned.
 *
 * Claude Code reads MCP configuration from:
 *   - .claude/settings.json  (project-level, applied when cwd is this project)
 *   - ~/.claude/settings.json (global)
 *
 * We write to the project-level file so the connector is scoped to Agent Flow.
 */
import fs from "fs/promises";
import path from "path";

interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface ClaudeSettings {
  mcpServers?: Record<string, McpServerConfig>;
  [key: string]: unknown;
}

function getSettingsPath(): string {
  return path.join(process.cwd(), ".claude", "settings.json");
}

async function readSettings(): Promise<ClaudeSettings> {
  try {
    const raw = await fs.readFile(getSettingsPath(), "utf-8");
    return JSON.parse(raw) as ClaudeSettings;
  } catch {
    return {};
  }
}

async function writeSettings(settings: ClaudeSettings): Promise<void> {
  const settingsPath = getSettingsPath();
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
}

/** Register the Slack MCP server in .claude/settings.json */
export async function registerSlackMcp(botToken: string): Promise<void> {
  const settings = await readSettings();
  settings.mcpServers = {
    ...settings.mcpServers,
    slack: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-slack"],
      env: {
        SLACK_BOT_TOKEN: botToken,
      },
    },
  };
  await writeSettings(settings);
}

/** Remove the Slack MCP server entry from .claude/settings.json */
export async function unregisterSlackMcp(): Promise<void> {
  const settings = await readSettings();
  if (settings.mcpServers?.slack) {
    delete settings.mcpServers.slack;
    if (Object.keys(settings.mcpServers).length === 0) {
      delete settings.mcpServers;
    }
  }
  await writeSettings(settings);
}

/** Check if Slack MCP is currently registered */
export async function isSlackMcpRegistered(): Promise<boolean> {
  const settings = await readSettings();
  return !!settings.mcpServers?.slack;
}
