import type { WorkflowDefinition } from "@agent-flow/core";

/**
 * Return a new definition with disabled steps filtered out.
 * Steps whose name appears in `disabledStepNames` are excluded.
 */
export function filterDisabledSteps(
  definition: WorkflowDefinition,
  disabledStepNames: Set<string>,
): WorkflowDefinition {
  if (disabledStepNames.size === 0) return definition;
  return {
    ...definition,
    workflow: definition.workflow.filter((step) => !disabledStepNames.has(step.name)),
  };
}
