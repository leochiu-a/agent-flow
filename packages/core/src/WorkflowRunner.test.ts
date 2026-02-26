import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "vitest";
import { WorkflowRunner } from "./WorkflowRunner";
import type { LogEntry, WorkflowDefinition } from "./types";

test("runs shell workflow successfully and emits logs", async () => {
  const runner = new WorkflowRunner();
  const logs: LogEntry[] = [];
  runner.on("log", (entry) => logs.push(entry));

  const definition: WorkflowDefinition = {
    name: "shell-success",
    workflow: [
      { name: "one", run: "printf 'alpha'" },
      { name: "two", run: "printf 'beta'" },
    ],
  };

  const result = await runner.run(definition);

  assert.equal(result.success, true);
  assert.equal(result.steps.length, 2);
  assert.equal(result.steps[0]?.success, true);
  assert.equal(result.steps[1]?.success, true);
  assert.ok(logs.some((entry) => entry.message.includes("Starting workflow: shell-success")));
  assert.ok(logs.some((entry) => entry.level === "stdout" && entry.message.includes("alpha")));
});

test("stops after the first failed step", async () => {
  const runner = new WorkflowRunner();

  const definition: WorkflowDefinition = {
    name: "stop-on-fail",
    workflow: [
      { name: "ok", run: "printf 'ok'" },
      { name: "boom", run: "exit 2" },
      { name: "never", run: "printf 'should-not-run'" },
    ],
  };

  const result = await runner.run(definition);

  assert.equal(result.success, false);
  assert.equal(result.steps.length, 2);
  assert.equal(result.steps[0]?.success, true);
  assert.equal(result.steps[1]?.success, false);
  assert.equal(result.steps[1]?.exitCode, 2);
});

test("marks unsupported step as failed", async () => {
  const runner = new WorkflowRunner();
  const result = await runner.run({
    name: "invalid-step",
    workflow: [{ name: "unknown-step" }],
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
    workflow: [{ name: "should-not-run", run: "printf 'x'" }],
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
  const filePath = path.join(tmpDir, "workflow.yaml");
  await writeFile(
    filePath,
    `
name: "from-file"
workflow:
  - name: "file-step"
    run: "printf 'from-yaml'"
`,
    "utf-8",
  );

  try {
    const runner = new WorkflowRunner();
    const result = await runner.runFile(filePath);

    assert.equal(result.success, true);
    assert.equal(result.steps.length, 1);
    assert.equal(result.steps[0]?.name, "file-step");
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});
