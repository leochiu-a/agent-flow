import assert from "node:assert/strict";
import { test, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockUpsertConnector = vi.fn().mockResolvedValue(undefined);
const mockRegisterSlackMcp = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/connectorStorage", () => ({
  upsertConnector: (...args: unknown[]) => mockUpsertConnector(...args),
}));

vi.mock("@/lib/claudeSettingsManager", () => ({
  registerSlackMcp: (...args: unknown[]) => mockRegisterSlackMcp(...args),
}));

vi.mock("@/lib/connectorLogger", () => ({
  logConnectorEvent: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("accepts xoxp- user token", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          ok: true,
          team: "Test Team",
          team_id: "T789",
          user_id: "U123",
        }),
    }),
  );

  const { POST } = await import("./route");
  const req = new NextRequest("http://localhost/api/connectors/slack/token", {
    method: "POST",
    body: JSON.stringify({ token: "xoxp-user-token-123" }),
  });
  const res = await POST(req);
  const json = (await res.json()) as { ok?: boolean };

  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
});

test("still accepts xoxb- bot token", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          ok: true,
          team: "Test Team",
          team_id: "T789",
          user_id: "U123",
        }),
    }),
  );

  const { POST } = await import("./route");
  const req = new NextRequest("http://localhost/api/connectors/slack/token", {
    method: "POST",
    body: JSON.stringify({ token: "xoxb-bot-token-123" }),
  });
  const res = await POST(req);
  const json = (await res.json()) as { ok?: boolean };

  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
});

test("rejects token with invalid prefix", async () => {
  const { POST } = await import("./route");
  const req = new NextRequest("http://localhost/api/connectors/slack/token", {
    method: "POST",
    body: JSON.stringify({ token: "invalid-token" }),
  });
  const res = await POST(req);

  assert.equal(res.status, 400);
});
