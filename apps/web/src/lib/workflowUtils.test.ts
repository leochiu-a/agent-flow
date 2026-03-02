import assert from "node:assert/strict";
import { test } from "vitest";
import { filterDisabledSteps } from "./workflowUtils";
import type { WorkflowDefinition } from "@agent-flow/core";

function makeDef(stepNames: string[]): WorkflowDefinition {
  return {
    name: "test-workflow",
    workflow: stepNames.map((name) => ({
      name,
      agent: "claude" as const,
      prompt: `prompt for ${name}`,
      skip_permission: false,
    })),
  };
}

test("returns full definition when no steps are disabled", () => {
  const def = makeDef(["step-1", "step-2", "step-3"]);
  const result = filterDisabledSteps(def, new Set());
  assert.equal(result.workflow.length, 3);
  assert.equal(result.name, "test-workflow");
});

test("filters out disabled steps by name", () => {
  const def = makeDef(["step-1", "step-2", "step-3"]);
  const result = filterDisabledSteps(def, new Set(["step-2"]));
  assert.equal(result.workflow.length, 2);
  assert.equal(result.workflow[0]!.name, "step-1");
  assert.equal(result.workflow[1]!.name, "step-3");
});

test("returns empty workflow when all steps are disabled", () => {
  const def = makeDef(["step-1", "step-2"]);
  const result = filterDisabledSteps(def, new Set(["step-1", "step-2"]));
  assert.equal(result.workflow.length, 0);
  assert.equal(result.name, "test-workflow");
});

test("preserves claude_session and other fields", () => {
  const def: WorkflowDefinition = {
    ...makeDef(["step-1", "step-2"]),
    claude_session: "shared",
  };
  const result = filterDisabledSteps(def, new Set(["step-1"]));
  assert.equal(result.claude_session, "shared");
  assert.equal(result.workflow.length, 1);
  assert.equal(result.workflow[0]!.name, "step-2");
});

test("ignores disabled names that do not match any step", () => {
  const def = makeDef(["step-1", "step-2"]);
  const result = filterDisabledSteps(def, new Set(["nonexistent"]));
  assert.equal(result.workflow.length, 2);
});
