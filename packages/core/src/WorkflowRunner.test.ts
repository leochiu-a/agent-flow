import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "vitest";
import { WorkflowRunner } from "./WorkflowRunner";
import type { LogEntry, WorkflowDefinition } from "./types";

async function createMockClaudeBinary(tmpDir: string): Promise<void> {
  const claudePath = path.join(tmpDir, "claude");
  await writeFile(
    claudePath,
    `#!/bin/sh
prev=""
prompt=""
resume=""
for arg in "$@"; do
  if [ -n "$CLAUDE_ARGS_LOG" ]; then
    printf '%s\\n' "$arg" >> "$CLAUDE_ARGS_LOG"
  fi
  if [ "$prev" = "--print" ]; then
    prompt="$arg"
  fi
  if [ "$prev" = "--resume" ]; then
    resume="$arg"
  fi
  prev="$arg"
done
if [ -n "$CLAUDE_ARGS_LOG" ]; then
  printf '__END__\\n' >> "$CLAUDE_ARGS_LOG"
fi
if [ -n "$CLAUDE_CWD_LOG" ]; then
  pwd > "$CLAUDE_CWD_LOG"
fi
if [ "$prompt" = "__FAIL__" ]; then
  printf '{"type":"assistant","message":{"content":[{"type":"text","text":"mock-fail"}]}}\\n'
  exit 2
fi
sid="\${resume:-session-1}"
printf '{"type":"assistant","message":{"content":[{"type":"text","text":"mock-ok"}]},"session_id":"%s"}\\n' "$sid"
printf '{"type":"result","total_cost_usd":0,"session_id":"%s"}\\n' "$sid"
`,
    "utf-8",
  );
  await chmod(claudePath, 0o755);
}

test("runs Claude workflow successfully and emits logs", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "agent-flow-claude-success-"));
  await createMockClaudeBinary(tmpDir);

  try {
    const runner = new WorkflowRunner({
      env: {
        PATH: `${tmpDir}:${process.env.PATH ?? ""}`,
      },
    });
    const logs: LogEntry[] = [];
    runner.on("log", (entry) => logs.push(entry));

    const definition: WorkflowDefinition = {
      name: "claude-success",
      workflow: [
        { name: "one", agent: "claude", prompt: "step one" },
        { name: "two", agent: "claude", prompt: "step two" },
      ],
    };

    const result = await runner.run(definition);

    assert.equal(result.success, true);
    assert.equal(result.steps.length, 2);
    assert.equal(result.steps[0]?.success, true);
    assert.equal(result.steps[1]?.success, true);
    assert.ok(logs.some((entry) => entry.message.includes("Starting workflow: claude-success")));
    assert.ok(logs.some((entry) => entry.level === "stdout" && entry.message.includes("mock-ok")));
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("stops after the first failed Claude step", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "agent-flow-claude-stop-on-fail-"));
  await createMockClaudeBinary(tmpDir);

  try {
    const runner = new WorkflowRunner({
      env: {
        PATH: `${tmpDir}:${process.env.PATH ?? ""}`,
      },
    });

    const definition: WorkflowDefinition = {
      name: "stop-on-fail",
      workflow: [
        { name: "ok", agent: "claude", prompt: "ok" },
        { name: "boom", agent: "claude", prompt: "__FAIL__" },
        { name: "never", agent: "claude", prompt: "should-not-run" },
      ],
    };

    const result = await runner.run(definition);

    assert.equal(result.success, false);
    assert.equal(result.steps.length, 2);
    assert.equal(result.steps[0]?.success, true);
    assert.equal(result.steps[1]?.success, false);
    assert.equal(result.steps[1]?.exitCode, 2);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("marks empty Claude prompt as failed", async () => {
  const runner = new WorkflowRunner();
  const result = await runner.run({
    name: "invalid-step",
    workflow: [{ name: "unknown-step", agent: "claude", prompt: "" }],
  });

  assert.equal(result.success, false);
  assert.equal(result.steps.length, 1);
  assert.deepEqual(result.steps[0], { name: "unknown-step", success: false, exitCode: null });
});

test("abort before run prevents any step execution", async () => {
  const runner = new WorkflowRunner();
  runner.abort();

  const result = await runner.run({
    name: "aborted",
    workflow: [{ name: "should-not-run", agent: "claude", prompt: "x" }],
  });

  assert.equal(result.success, false);
  assert.equal(result.steps.length, 0);
});

test("claude_session=shared resumes the previous Claude session id", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "agent-flow-claude-shared-"));
  const claudePath = path.join(tmpDir, "claude");
  const argsLogPath = path.join(tmpDir, "claude-args.log");

  await writeFile(
    claudePath,
    `#!/bin/sh
prev=""
resume=""
for arg in "$@"; do
  printf '%s\\n' "$arg" >> "$CLAUDE_ARGS_LOG"
  if [ "$prev" = "--resume" ]; then
    resume="$arg"
  fi
  prev="$arg"
done
printf '__END__\\n' >> "$CLAUDE_ARGS_LOG"
sid="\${resume:-session-1}"
printf '{"type":"system","subtype":"init","session_id":"%s"}\\n' "$sid"
printf '{"type":"result","total_cost_usd":0,"session_id":"%s"}\\n' "$sid"
`,
    "utf-8",
  );
  await chmod(claudePath, 0o755);

  try {
    const runner = new WorkflowRunner({
      env: {
        PATH: `${tmpDir}:${process.env.PATH ?? ""}`,
        CLAUDE_ARGS_LOG: argsLogPath,
      },
    });

    const result = await runner.run({
      name: "claude-shared",
      claude_session: "shared",
      workflow: [
        { name: "jira", agent: "claude", prompt: "step one" },
        { name: "slack", agent: "claude", prompt: "step two" },
      ],
    });

    assert.equal(result.success, true);
    const segments = (await readFile(argsLogPath, "utf-8"))
      .trim()
      .split("__END__")
      .map((segment) => segment.trim().split("\n").filter(Boolean))
      .filter((segment) => segment.length > 0);

    assert.equal(segments.length, 2);
    assert.equal(segments[0]?.includes("--resume"), false);

    const second = segments[1] ?? [];
    const resumeIndex = second.indexOf("--resume");
    assert.ok(resumeIndex >= 0);
    assert.equal(second[resumeIndex + 1], "session-1");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("claude_session defaults to isolated and does not auto-resume", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "agent-flow-claude-isolated-"));
  const claudePath = path.join(tmpDir, "claude");
  const argsLogPath = path.join(tmpDir, "claude-args.log");

  await writeFile(
    claudePath,
    `#!/bin/sh
for arg in "$@"; do
  printf '%s\\n' "$arg" >> "$CLAUDE_ARGS_LOG"
done
printf '__END__\\n' >> "$CLAUDE_ARGS_LOG"
printf '{"type":"system","subtype":"init","session_id":"session-1"}\\n'
printf '{"type":"result","total_cost_usd":0,"session_id":"session-1"}\\n'
`,
    "utf-8",
  );
  await chmod(claudePath, 0o755);

  try {
    const runner = new WorkflowRunner({
      env: {
        PATH: `${tmpDir}:${process.env.PATH ?? ""}`,
        CLAUDE_ARGS_LOG: argsLogPath,
      },
    });

    const result = await runner.run({
      name: "claude-isolated",
      workflow: [
        { name: "jira", agent: "claude", prompt: "step one" },
        { name: "slack", agent: "claude", prompt: "step two" },
      ],
    });

    assert.equal(result.success, true);
    const segments = (await readFile(argsLogPath, "utf-8"))
      .trim()
      .split("__END__")
      .map((segment) => segment.trim().split("\n").filter(Boolean))
      .filter((segment) => segment.length > 0);

    assert.equal(segments.length, 2);
    assert.equal(segments[0]?.includes("--resume"), false);
    assert.equal(segments[1]?.includes("--resume"), false);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("runFile loads YAML definition and executes it", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "agent-flow-runfile-"));
  await createMockClaudeBinary(tmpDir);
  const filePath = path.join(tmpDir, "workflow.yaml");
  await writeFile(
    filePath,
    `
name: "from-file"
workflow:
  - name: "file-step"
    agent: claude
    prompt: "from-yaml"
`,
    "utf-8",
  );

  try {
    const runner = new WorkflowRunner({
      env: {
        PATH: `${tmpDir}:${process.env.PATH ?? ""}`,
      },
    });
    const result = await runner.runFile(filePath);

    assert.equal(result.success, true);
    assert.equal(result.steps.length, 1);
    assert.equal(result.steps[0]?.name, "file-step");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("run() with initialClaudeSessionId resumes from provided session on first step in shared mode", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "agent-flow-initial-session-"));
  const claudePath = path.join(tmpDir, "claude");
  const argsLogPath = path.join(tmpDir, "claude-args.log");

  await writeFile(
    claudePath,
    `#!/bin/sh
prev=""
resume=""
for arg in "$@"; do
  printf '%s\\n' "$arg" >> "$CLAUDE_ARGS_LOG"
  if [ "$prev" = "--resume" ]; then
    resume="$arg"
  fi
  prev="$arg"
done
printf '__END__\\n' >> "$CLAUDE_ARGS_LOG"
sid="\${resume:-session-new}"
printf '{"type":"system","subtype":"init","session_id":"%s"}\\n' "$sid"
printf '{"type":"result","total_cost_usd":0,"session_id":"%s"}\\n' "$sid"
`,
    "utf-8",
  );
  await chmod(claudePath, 0o755);

  try {
    const runner = new WorkflowRunner({
      env: {
        PATH: `${tmpDir}:${process.env.PATH ?? ""}`,
        CLAUDE_ARGS_LOG: argsLogPath,
      },
    });

    const result = await runner.run(
      {
        name: "continue-shared",
        claude_session: "shared",
        workflow: [
          { name: "step-a", agent: "claude", prompt: "first" },
          { name: "step-b", agent: "claude", prompt: "second" },
        ],
      },
      { initialClaudeSessionId: "prev-session-42" },
    );

    assert.equal(result.success, true);
    const segments = (await readFile(argsLogPath, "utf-8"))
      .trim()
      .split("__END__")
      .map((segment) => segment.trim().split("\n").filter(Boolean))
      .filter((segment) => segment.length > 0);

    // First step should --resume the provided initial session ID
    const first = segments[0] ?? [];
    const resumeIdx0 = first.indexOf("--resume");
    assert.ok(resumeIdx0 >= 0, "first step should have --resume flag");
    assert.equal(first[resumeIdx0 + 1], "prev-session-42");

    // Second step should --resume the session ID returned by the first step
    const second = segments[1] ?? [];
    const resumeIdx1 = second.indexOf("--resume");
    assert.ok(resumeIdx1 >= 0, "second step should have --resume flag");
    assert.equal(second[resumeIdx1 + 1], "prev-session-42");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("initialClaudeSessionId is ignored in isolated mode", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "agent-flow-initial-isolated-"));
  const claudePath = path.join(tmpDir, "claude");
  const argsLogPath = path.join(tmpDir, "claude-args.log");

  await writeFile(
    claudePath,
    `#!/bin/sh
for arg in "$@"; do
  printf '%s\\n' "$arg" >> "$CLAUDE_ARGS_LOG"
done
printf '__END__\\n' >> "$CLAUDE_ARGS_LOG"
printf '{"type":"system","subtype":"init","session_id":"session-1"}\\n'
printf '{"type":"result","total_cost_usd":0,"session_id":"session-1"}\\n'
`,
    "utf-8",
  );
  await chmod(claudePath, 0o755);

  try {
    const runner = new WorkflowRunner({
      env: {
        PATH: `${tmpDir}:${process.env.PATH ?? ""}`,
        CLAUDE_ARGS_LOG: argsLogPath,
      },
    });

    const result = await runner.run(
      {
        name: "isolated-with-initial",
        workflow: [{ name: "step", agent: "claude", prompt: "hello" }],
      },
      { initialClaudeSessionId: "should-be-ignored" },
    );

    assert.equal(result.success, true);
    const args = (await readFile(argsLogPath, "utf-8")).trim();
    assert.equal(args.includes("--resume"), false, "isolated mode should not use --resume");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("getClaudeSessionId() returns the session ID after run", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "agent-flow-get-session-"));
  await createMockClaudeBinary(tmpDir);

  try {
    const runner = new WorkflowRunner({
      env: {
        PATH: `${tmpDir}:${process.env.PATH ?? ""}`,
      },
    });

    assert.equal(runner.getClaudeSessionId(), null, "should be null before run");

    await runner.run({
      name: "get-session-test",
      claude_session: "shared",
      workflow: [{ name: "step", agent: "claude", prompt: "hello" }],
    });

    assert.equal(runner.getClaudeSessionId(), "session-1", "should return captured session ID");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("uses configured cwd when spawning Claude", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "agent-flow-cwd-"));
  await createMockClaudeBinary(tmpDir);
  const workspaceDir = path.join(tmpDir, "workspace");
  const cwdLogPath = path.join(tmpDir, "cwd.log");
  await mkdir(workspaceDir, { recursive: true });

  try {
    const runner = new WorkflowRunner({
      cwd: workspaceDir,
      env: {
        PATH: `${tmpDir}:${process.env.PATH ?? ""}`,
        CLAUDE_CWD_LOG: cwdLogPath,
      },
    });

    const result = await runner.run({
      name: "cwd-test",
      workflow: [{ name: "step", agent: "claude", prompt: "verify cwd" }],
    });

    assert.equal(result.success, true);
    const cwdUsed = (await readFile(cwdLogPath, "utf-8")).trim();
    assert.equal(cwdUsed, await realpath(workspaceDir));
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("step with skill passes --append-system-prompt with skill file content", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "agent-flow-skill-"));
  await createMockClaudeBinary(tmpDir);
  const argsLogPath = path.join(tmpDir, "claude-args.log");

  // Create a fake ~/.claude/skills/code-review/SKILL.md
  const fakeHome = path.join(tmpDir, "fakehome");
  const skillDir = path.join(fakeHome, ".claude", "skills", "code-review");
  await mkdir(skillDir, { recursive: true });
  await writeFile(path.join(skillDir, "SKILL.md"), "You are a code reviewer.", "utf-8");

  try {
    const runner = new WorkflowRunner({
      env: {
        PATH: `${tmpDir}:${process.env.PATH ?? ""}`,
        CLAUDE_ARGS_LOG: argsLogPath,
        HOME: fakeHome,
      },
    });

    const result = await runner.run({
      name: "skill-test",
      workflow: [{ name: "review", agent: "claude", prompt: "review code", skill: "code-review" }],
    });

    assert.equal(result.success, true);
    const args = (await readFile(argsLogPath, "utf-8")).trim().split("\n");
    const appendIdx = args.indexOf("--append-system-prompt");
    assert.ok(appendIdx >= 0, "should pass --append-system-prompt");
    assert.equal(args[appendIdx + 1], "You are a code reviewer.");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("step with missing skill logs warning but still succeeds", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "agent-flow-skill-missing-"));
  await createMockClaudeBinary(tmpDir);
  const argsLogPath = path.join(tmpDir, "claude-args.log");

  const fakeHome = path.join(tmpDir, "fakehome");
  await mkdir(path.join(fakeHome, ".claude"), { recursive: true });

  try {
    const runner = new WorkflowRunner({
      env: {
        PATH: `${tmpDir}:${process.env.PATH ?? ""}`,
        CLAUDE_ARGS_LOG: argsLogPath,
        HOME: fakeHome,
      },
    });
    const logs: LogEntry[] = [];
    runner.on("log", (entry) => logs.push(entry));

    const result = await runner.run({
      name: "missing-skill",
      workflow: [{ name: "step", agent: "claude", prompt: "hello", skill: "nonexistent" }],
    });

    assert.equal(result.success, true);
    const args = (await readFile(argsLogPath, "utf-8")).trim().split("\n");
    assert.equal(
      args.includes("--append-system-prompt"),
      false,
      "should NOT pass --append-system-prompt",
    );
    assert.ok(
      logs.some((l) => l.level === "error" && l.message.includes("nonexistent")),
      "should log warning about missing skill",
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("step without skill does not include --append-system-prompt", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "agent-flow-no-skill-"));
  await createMockClaudeBinary(tmpDir);
  const argsLogPath = path.join(tmpDir, "claude-args.log");

  try {
    const runner = new WorkflowRunner({
      env: {
        PATH: `${tmpDir}:${process.env.PATH ?? ""}`,
        CLAUDE_ARGS_LOG: argsLogPath,
      },
    });

    const result = await runner.run({
      name: "no-skill",
      workflow: [{ name: "step", agent: "claude", prompt: "hello" }],
    });

    assert.equal(result.success, true);
    const args = (await readFile(argsLogPath, "utf-8")).trim().split("\n");
    assert.equal(args.includes("--append-system-prompt"), false);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("skill resolution falls back to plugin skills when user skill not found", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "agent-flow-skill-plugin-"));
  await createMockClaudeBinary(tmpDir);
  const argsLogPath = path.join(tmpDir, "claude-args.log");

  const fakeHome = path.join(tmpDir, "fakehome");
  // Create plugin skill: ~/.claude/plugins/marketplaces/default/plugins/my-plugin/skills/lint/SKILL.md
  const pluginSkillDir = path.join(
    fakeHome,
    ".claude",
    "plugins",
    "marketplaces",
    "default",
    "plugins",
    "my-plugin",
    "skills",
    "lint",
  );
  await mkdir(pluginSkillDir, { recursive: true });
  await writeFile(path.join(pluginSkillDir, "SKILL.md"), "You are a linter.", "utf-8");

  try {
    const runner = new WorkflowRunner({
      env: {
        PATH: `${tmpDir}:${process.env.PATH ?? ""}`,
        CLAUDE_ARGS_LOG: argsLogPath,
        HOME: fakeHome,
      },
    });

    const result = await runner.run({
      name: "plugin-skill",
      workflow: [{ name: "lint", agent: "claude", prompt: "lint code", skill: "lint" }],
    });

    assert.equal(result.success, true);
    const args = (await readFile(argsLogPath, "utf-8")).trim().split("\n");
    const appendIdx = args.indexOf("--append-system-prompt");
    assert.ok(appendIdx >= 0, "should pass --append-system-prompt from plugin skill");
    assert.equal(args[appendIdx + 1], "You are a linter.");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});
