import assert from "node:assert/strict";
import { test, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockUpsertConnector = vi.fn();
const mockRegisterSlackMcp = vi.fn();
const mockConsumeOAuthState = vi.fn();

vi.mock("@/lib/connectorStorage", () => ({
  upsertConnector: (...args: unknown[]) => mockUpsertConnector(...args),
}));

vi.mock("@/lib/claudeSettingsManager", () => ({
  registerSlackMcp: (...args: unknown[]) => mockRegisterSlackMcp(...args),
}));

vi.mock("@/lib/oauthStateStore", () => ({
  consumeOAuthState: (...args: unknown[]) => mockConsumeOAuthState(...args),
}));

vi.mock("@/lib/connectorLogger", () => ({
  logConnectorEvent: vi.fn(),
}));

vi.mock("@/lib/appConfig", () => ({
  getSlackOAuthConfig: vi.fn().mockResolvedValue({
    clientId: "test-client-id",
    clientSecret: "test-secret",
    redirectUri: "https://example.com/api/connectors/slack/oauth/callback",
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockConsumeOAuthState.mockResolvedValue({ returnTo: "/connectors" });
  mockUpsertConnector.mockResolvedValue(undefined);
  mockRegisterSlackMcp.mockResolvedValue(undefined);
});

test("extracts user token from authed_user.access_token", async () => {
  const slackResponse = {
    ok: true,
    authed_user: {
      id: "U123",
      access_token: "xoxp-user-token-abc",
    },
    team: { id: "T456", name: "Test Team" },
  };

  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: () => Promise.resolve(slackResponse),
    }),
  );

  const { GET } = await import("./route");
  const url =
    "http://localhost/api/connectors/slack/oauth/callback?code=test-code&state=test-state";
  const req = new NextRequest(url);
  const res = await GET(req);

  assert.equal(res.status, 302);
  const location = res.headers.get("location")!;
  assert.ok(location.includes("status=connected"), "should redirect with connected status");

  assert.equal(mockRegisterSlackMcp.mock.calls.length, 1);
  assert.equal(mockRegisterSlackMcp.mock.calls[0][0].botToken, "xoxp-user-token-abc");
  assert.equal(mockRegisterSlackMcp.mock.calls[0][0].teamId, "T456");
});

test("redirects to error when authed_user.access_token is missing", async () => {
  const slackResponse = {
    ok: true,
    team: { id: "T456", name: "Test Team" },
  };

  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: () => Promise.resolve(slackResponse),
    }),
  );

  const { GET } = await import("./route");
  const url =
    "http://localhost/api/connectors/slack/oauth/callback?code=test-code&state=test-state";
  const req = new NextRequest(url);
  const res = await GET(req);

  assert.equal(res.status, 302);
  const location = res.headers.get("location")!;
  assert.ok(location.includes("status=error"), "should redirect with error status");
});
