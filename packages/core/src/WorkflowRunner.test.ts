import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
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
