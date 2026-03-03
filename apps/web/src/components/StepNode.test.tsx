/* @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ReactFlowProvider } from "@xyflow/react";
import { StepNode } from "./StepNode";
import type { StepNodeData } from "./StepNode";

afterEach(cleanup);

function renderStepNode(overrides: Partial<StepNodeData> = {}) {
  const defaultData: StepNodeData = {
    title: "Test Step",
    type: "claude",
    prompt: "Do something",
    onRequestEdit: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };

  return render(
    <ReactFlowProvider>
      <StepNode
        id="test-1"
        data={defaultData}
        type="step"
        selected={false}
        dragging={false}
        isConnectable={true}
        positionAbsoluteX={0}
        positionAbsoluteY={0}
        zIndex={0}
      />
    </ReactFlowProvider>,
  );
}

test("shows skill badge when skill is set", () => {
  renderStepNode({ skill: "code-review" });
  expect(screen.getByText("code-review")).toBeTruthy();
  expect(screen.getByText("Skill:")).toBeTruthy();
});

test("does not show skill badge when skill is not set", () => {
  renderStepNode();
  expect(screen.queryByText("Skill:")).toBeNull();
});
