import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "vitest";
import {
  registerJiraMcp,
  registerSlackMcp,
  unregisterJiraMcp,
  unregisterSlackMcp,
} from "./claudeSettingsManager";

interface TempContext {
  workspaceDir: string;
  homeDir: string;
}

async function withTempCwd(fn: (ctx: TempContext) => Promise<void>): Promise<void> {
  const originalCwd = process.cwd();
  const originalHome = process.env.HOME;
  const originalOverride = process.env.AGENT_FLOW_CLAUDE_PROJECT_PATH;

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "agent-flow-claude-settings-"));
  const homeDir = path.join(tempDir, "home");
  const workspaceDir = path.join(tempDir, "workspace");
  await mkdir(homeDir, { recursive: true });
  await mkdir(workspaceDir, { recursive: true });

  process.env.HOME = homeDir;
  delete process.env.AGENT_FLOW_CLAUDE_PROJECT_PATH;
  process.chdir(workspaceDir);

  try {
    await fn({ workspaceDir, homeDir });
  } finally {
    process.chdir(originalCwd);
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    if (originalOverride === undefined) {
      delete process.env.AGENT_FLOW_CLAUDE_PROJECT_PATH;
    } else {
      process.env.AGENT_FLOW_CLAUDE_PROJECT_PATH = originalOverride;
    }
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function readClaudeState(homeDir: string): Promise<{
  mcpServers?: Record<
    string,
    {
      type?: string;
      command?: string;
      args?: string[];
      env?: Record<string, string>;
    }
  >;
  projects?: Record<
    string,
    {
      mcpServers?: Record<
        string,
        {
          type?: string;
          command?: string;
          args?: string[];
          env?: Record<string, string>;
        }
      >;
    }
  >;
}> {
  const statePath = path.join(homeDir, ".claude.json");
  const raw = await readFile(statePath, "utf-8");
  return JSON.parse(raw) as {
    mcpServers?: Record<
      string,
      {
        type?: string;
        command?: string;
        args?: string[];
        env?: Record<string, string>;
      }
    >;
    projects?: Record<
      string,
      {
        mcpServers?: Record<
          string,
          {
            type?: string;
            command?: string;
            args?: string[];
            env?: Record<string, string>;
          }
        >;
      }
    >;
  };
}

test("registerSlackMcp writes MCP server entry into ~/.claude.json user config", async () => {
  await withTempCwd(async ({ homeDir }) => {
    await registerSlackMcp({ botToken: "xoxb-test-token", teamId: "T123" });

    const state = await readClaudeState(homeDir);
    assert.equal(state.mcpServers?.slack?.type, "stdio");
    assert.equal(state.mcpServers?.slack?.command, "npx");
    assert.deepEqual(state.mcpServers?.slack?.args, ["-y", "@modelcontextprotocol/server-slack"]);
    assert.equal(state.mcpServers?.slack?.env?.SLACK_BOT_TOKEN, "xoxb-test-token");
    assert.equal(state.mcpServers?.slack?.env?.SLACK_TEAM_ID, "T123");
  });
});

test("unregisterSlackMcp removes slack MCP entry", async () => {
  await withTempCwd(async ({ homeDir }) => {
    await registerSlackMcp({ botToken: "xoxb-test-token", teamId: "T123" });
    await unregisterSlackMcp();

    const state = await readClaudeState(homeDir);
    assert.equal(state.mcpServers?.slack, undefined);
  });
});

test("registerJiraMcp writes Jira MCP entry with default package", async () => {
  await withTempCwd(async ({ homeDir }) => {
    await registerJiraMcp({
      siteUrl: "https://mysite.atlassian.net",
      userEmail: "user@example.com",
      apiToken: "jira-token",
    });

    const state = await readClaudeState(homeDir);
    assert.equal(state.mcpServers?.jira?.type, "stdio");
    assert.equal(state.mcpServers?.jira?.command, "npx");
    assert.deepEqual(state.mcpServers?.jira?.args, ["-y", "@aashari/mcp-server-atlassian-jira"]);
    assert.equal(state.mcpServers?.jira?.env?.ATLASSIAN_SITE_NAME, "mysite");
    assert.equal(state.mcpServers?.jira?.env?.ATLASSIAN_USER_EMAIL, "user@example.com");
    assert.equal(state.mcpServers?.jira?.env?.ATLASSIAN_API_TOKEN, "jira-token");
  });
});

test("unregisterJiraMcp removes jira MCP entry while preserving others", async () => {
  await withTempCwd(async ({ homeDir }) => {
    await registerSlackMcp({ botToken: "xoxb-test-token", teamId: "T123" });
    await registerJiraMcp({
      siteUrl: "https://mysite.atlassian.net",
      userEmail: "user@example.com",
      apiToken: "jira-token",
    });

    await unregisterJiraMcp();

    const state = await readClaudeState(homeDir);
    assert.ok(state.mcpServers?.slack);
    assert.equal(state.mcpServers?.jira, undefined);
  });
});
