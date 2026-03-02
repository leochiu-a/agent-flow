/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { DeleteWorkflowDialog } from "./DeleteWorkflowDialog";

afterEach(() => {
  cleanup();
});

test("shows title and workflow-specific description when open", () => {
  render(
    <DeleteWorkflowDialog
      open
      workflowName="demo.yaml"
      isDeleting={false}
      onOpenChange={() => {}}
      onConfirmDelete={() => {}}
    />,
  );

  expect(screen.getByText("Delete this workflow?")).toBeTruthy();
  expect(
    screen.getByText(
      "This action cannot be undone. Are you sure you want to delete demo.yaml? Session history will be kept.",
    ),
  ).toBeTruthy();
});

test("clicking cancel closes dialog without confirming delete", async () => {
  const user = userEvent.setup();
  const onOpenChange = vi.fn();
  const onConfirmDelete = vi.fn();

  render(
    <DeleteWorkflowDialog
      open
      workflowName="demo.yaml"
      isDeleting={false}
      onOpenChange={onOpenChange}
      onConfirmDelete={onConfirmDelete}
    />,
  );

  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onConfirmDelete).toHaveBeenCalledTimes(0);
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test("clicking delete triggers confirm callback once", async () => {
  const user = userEvent.setup();
  const onConfirmDelete = vi.fn();

  render(
    <DeleteWorkflowDialog
      open
      workflowName="demo.yaml"
      isDeleting={false}
      onOpenChange={() => {}}
      onConfirmDelete={onConfirmDelete}
    />,
  );

  await user.click(screen.getByRole("button", { name: "Delete" }));

  expect(onConfirmDelete).toHaveBeenCalledTimes(1);
});

test("deleting state disables actions and shows deleting label", () => {
  render(
    <DeleteWorkflowDialog
      open
      workflowName="demo.yaml"
      isDeleting
      onOpenChange={() => {}}
      onConfirmDelete={() => {}}
    />,
  );

  const cancelButton = screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement;
  const deleteButton = screen.getByRole("button", { name: "Deleting..." }) as HTMLButtonElement;

  expect(cancelButton.disabled).toBe(true);
  expect(deleteButton.disabled).toBe(true);
});
