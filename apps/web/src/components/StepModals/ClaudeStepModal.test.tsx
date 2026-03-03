/* @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";

// Mock SkillCombobox to avoid network calls and simplify testing
vi.mock("@/components/SkillCombobox", () => ({
  SkillCombobox: ({
    value,
    onChange,
    disabled,
  }: {
    value: string | undefined;
    onChange: (v: string | undefined) => void;
    disabled?: boolean;
  }) => (
    <select
      data-testid="skill-combobox"
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value || undefined)}
    >
      <option value="">None</option>
      <option value="code-review">code-review</option>
      <option value="lint">lint</option>
    </select>
  ),
}));

import { ClaudeStepModal } from "./ClaudeStepModal";

afterEach(cleanup);

test("renders skill combobox in the form", () => {
  render(
    <ClaudeStepModal
      initialTitle="Step"
      initialPrompt="Do stuff"
      saving={false}
      error={null}
      onSave={vi.fn()}
      onCancel={vi.fn()}
    />,
  );

  expect(screen.getByTestId("skill-combobox")).toBeTruthy();
  expect(screen.getByText("Skill (optional)")).toBeTruthy();
});

test("passes skill value through onSave callback", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();

  render(
    <ClaudeStepModal
      initialTitle="Step"
      initialPrompt="Do stuff"
      saving={false}
      error={null}
      onSave={onSave}
      onCancel={vi.fn()}
    />,
  );

  // Select a skill
  await user.selectOptions(screen.getByTestId("skill-combobox"), "code-review");
  // Click save
  await user.click(screen.getByText("Save Step"));

  expect(onSave).toHaveBeenCalledWith({
    title: "Step",
    prompt: "Do stuff",
    skipPermission: false,
    skill: "code-review",
  });
});

test("passes undefined skill when no skill selected", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();

  render(
    <ClaudeStepModal
      initialTitle="Step"
      initialPrompt="Do stuff"
      saving={false}
      error={null}
      onSave={onSave}
      onCancel={vi.fn()}
    />,
  );

  await user.click(screen.getByText("Save Step"));
  expect(onSave).toHaveBeenCalledWith({
    title: "Step",
    prompt: "Do stuff",
    skipPermission: false,
    skill: undefined,
  });
});

test("initialSkill pre-populates the combobox", () => {
  render(
    <ClaudeStepModal
      initialTitle="Step"
      initialPrompt="Do stuff"
      initialSkill="lint"
      saving={false}
      error={null}
      onSave={vi.fn()}
      onCancel={vi.fn()}
    />,
  );

  const combobox = screen.getByTestId("skill-combobox") as HTMLSelectElement;
  expect(combobox.value).toBe("lint");
});
