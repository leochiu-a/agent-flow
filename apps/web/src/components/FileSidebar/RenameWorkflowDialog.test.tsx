/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { RenameWorkflowDialog } from "./RenameWorkflowDialog";

afterEach(() => {
  cleanup();
});

test("shows current workflow name pre-filled in input when open", () => {
  render(
    <RenameWorkflowDialog
      open
      workflowName="demo.yaml"
      isRenaming={false}
      onOpenChange={() => {}}
      onConfirmRename={() => {}}
    />,
  );

  const input = screen.getByRole("textbox") as HTMLInputElement;
  expect(input.value).toBe("demo.yaml");
});

test("clicking cancel closes dialog without calling onConfirmRename", async () => {
  const user = userEvent.setup();
  const onOpenChange = vi.fn();
  const onConfirmRename = vi.fn();

  render(
    <RenameWorkflowDialog
      open
      workflowName="demo.yaml"
      isRenaming={false}
      onOpenChange={onOpenChange}
      onConfirmRename={onConfirmRename}
    />,
  );

  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onConfirmRename).toHaveBeenCalledTimes(0);
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test("clicking Rename calls onConfirmRename with current input value", async () => {
  const user = userEvent.setup();
  const onConfirmRename = vi.fn();

  render(
    <RenameWorkflowDialog
      open
      workflowName="demo.yaml"
      isRenaming={false}
      onOpenChange={() => {}}
      onConfirmRename={onConfirmRename}
    />,
  );

  const input = screen.getByRole("textbox");
  await user.clear(input);
  await user.type(input, "renamed.yaml");
  await user.click(screen.getByRole("button", { name: "Rename" }));

  expect(onConfirmRename).toHaveBeenCalledWith("renamed.yaml");
});

test("rename button is disabled and shows Renaming... while isRenaming is true", () => {
  render(
    <RenameWorkflowDialog
      open
      workflowName="demo.yaml"
      isRenaming
      onOpenChange={() => {}}
      onConfirmRename={() => {}}
    />,
  );

  const renameBtn = screen.getByRole("button", { name: "Renaming..." }) as HTMLButtonElement;
  expect(renameBtn.disabled).toBe(true);
});

test("cancel button is disabled while isRenaming is true", () => {
  render(
    <RenameWorkflowDialog
      open
      workflowName="demo.yaml"
      isRenaming
      onOpenChange={() => {}}
      onConfirmRename={() => {}}
    />,
  );

  const cancelBtn = screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement;
  expect(cancelBtn.disabled).toBe(true);
});

test("Rename button is disabled when input is empty or whitespace-only", async () => {
  const user = userEvent.setup();

  render(
    <RenameWorkflowDialog
      open
      workflowName="demo.yaml"
      isRenaming={false}
      onOpenChange={() => {}}
      onConfirmRename={() => {}}
    />,
  );

  const input = screen.getByRole("textbox");
  await user.clear(input);

  const renameBtn = screen.getByRole("button", { name: "Rename" }) as HTMLButtonElement;
  expect(renameBtn.disabled).toBe(true);
});
