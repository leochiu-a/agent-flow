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
