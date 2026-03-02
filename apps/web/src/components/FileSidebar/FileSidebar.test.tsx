/* @vitest-environment jsdom */

import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

const pushMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/workflow/demo.yaml",
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function setupFetch({ deleteOk = true }: { deleteOk?: boolean } = {}) {
  fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url === "/api/workflow/list") {
      return {
        ok: true,
        status: 200,
        json: async () => ({ workflows: ["demo.yaml", "other.yaml"] }),
      };
    }

    if (url === "/api/workflow/sessions/all") {
      return {
        ok: true,
        status: 200,
        json: async () => ({ sessions: [] }),
      };
    }

    if (url.startsWith("/api/workflow/delete?file=") && method === "DELETE") {
      return {
        ok: deleteOk,
        status: deleteOk ? 200 : 500,
        json: async () => (deleteOk ? { ok: true } : { error: "delete failed" }),
      };
    }

    throw new Error(`Unexpected fetch call: ${method} ${url}`);
  });
}

async function renderSidebar({
  selectedFile = null,
  selectedFolder = null,
}: {
  selectedFile?: string | null;
  selectedFolder?: string | null;
} = {}) {
  const { FileSidebar } = await import("./FileSidebar");
  render(<FileSidebar selectedFile={selectedFile} selectedFolder={selectedFolder} />);
}

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  pushMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("opens delete dialog and cancel keeps workflow", async () => {
  setupFetch();
  const user = userEvent.setup();

  await renderSidebar();
  await screen.findByText("demo.yaml");

  await user.click(screen.getByRole("button", { name: "Delete workflow demo.yaml" }));
  expect(screen.getByText("Delete this workflow?")).toBeTruthy();

  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByText("demo.yaml")).toBeTruthy();
  expect(
    fetchMock.mock.calls.some(
      ([url, init]) =>
        String(url).startsWith("/api/workflow/delete?file=") && init?.method === "DELETE",
    ),
  ).toBe(false);
});

test("confirm delete removes workflow and navigates home when deleting selected workflow", async () => {
  setupFetch();
  const user = userEvent.setup();

  await renderSidebar({ selectedFile: "demo.yaml" });
  await screen.findByText("demo.yaml");

  await user.click(screen.getByRole("button", { name: "Delete workflow demo.yaml" }));
  await user.click(screen.getByRole("button", { name: "Delete" }));

  await waitFor(() => {
    expect(screen.queryByText("demo.yaml")).toBeNull();
  });

  expect(pushMock).toHaveBeenCalledWith("/");
  expect(
    fetchMock.mock.calls.some(
      ([url, init]) =>
        String(url) === "/api/workflow/delete?file=demo.yaml" && init?.method === "DELETE",
    ),
  ).toBe(true);
});

test("failed delete shows alert and keeps workflow", async () => {
  setupFetch({ deleteOk: false });
  const user = userEvent.setup();
  const alertMock = vi.fn();
  vi.stubGlobal("alert", alertMock);

  await renderSidebar();
  await screen.findByText("demo.yaml");

  await user.click(screen.getByRole("button", { name: "Delete workflow demo.yaml" }));
  await user.click(screen.getByRole("button", { name: "Delete" }));

  await waitFor(() => {
    expect(alertMock).toHaveBeenCalledWith("Failed to delete. Please try again.");
  });
  expect(screen.getByText("demo.yaml")).toBeTruthy();
});
