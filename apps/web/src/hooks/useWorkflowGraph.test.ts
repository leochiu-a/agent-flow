/* @vitest-environment jsdom */
import assert from "node:assert/strict";
import { test } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWorkflowGraph } from "./useWorkflowGraph";
import type { WorkflowDefinition } from "@agent-flow/core";

test("getDefinition includes skill when set on a node", () => {
  const { result } = renderHook(() => useWorkflowGraph({ activeFile: "test.yaml" }));

  act(() => {
    result.current.addNode();
  });

  const nodeId = result.current.nodes[0]!.id;

  act(() => {
    result.current.updateNode(nodeId, {
      title: "Review",
      prompt: "review code",
      skill: "code-review",
    });
  });

  const def = result.current.getDefinition();
  assert.equal(def.workflow[0]!.skill, "code-review");
});

test("getDefinition omits skill key when not set", () => {
  const { result } = renderHook(() => useWorkflowGraph({ activeFile: "test.yaml" }));

  act(() => {
    result.current.addNode();
  });

  const nodeId = result.current.nodes[0]!.id;

  act(() => {
    result.current.updateNode(nodeId, {
      title: "Step",
      prompt: "do something",
    });
  });

  const def = result.current.getDefinition();
  assert.equal("skill" in def.workflow[0]!, false, "skill key should not be present");
});

test("loadDefinition maps skill from workflow step to node data", () => {
  const { result } = renderHook(() => useWorkflowGraph({ activeFile: "test.yaml" }));

  const definition: WorkflowDefinition = {
    name: "test",
    workflow: [
      { name: "Step 1", agent: "claude", prompt: "hello", skill: "lint" },
      { name: "Step 2", agent: "claude", prompt: "world" },
    ],
  };

  act(() => {
    result.current.loadDefinition(definition);
  });

  const nodes = result.current.nodes;
  assert.equal(nodes.length, 2);
  assert.equal((nodes[0]!.data as { skill?: string }).skill, "lint");
  assert.equal((nodes[1]!.data as { skill?: string }).skill, undefined);
});
