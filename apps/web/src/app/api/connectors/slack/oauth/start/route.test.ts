import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/appConfig", () => ({
  getSlackOAuthConfig: vi.fn().mockResolvedValue({
    clientId: "test-client-id",
    clientSecret: "test-secret",
    redirectUri: "https://example.com/api/connectors/slack/oauth/callback",
  }),
}));

vi.mock("@/lib/oauthStateStore", () => ({
  createOAuthState: vi.fn().mockResolvedValue("test-state-123"),
  pruneExpiredStates: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/connectorLogger", () => ({
  logConnectorEvent: vi.fn(),
}));

test("authorize URL uses user_scope instead of scope", async () => {
  const { GET } = await import("./route");
  const req = new NextRequest("http://localhost/api/connectors/slack/oauth/start");
  const res = await GET(req);

  assert.equal(res.status, 302);
  const location = res.headers.get("location")!;
  const url = new URL(location);

  assert.ok(url.searchParams.has("user_scope"), "should have user_scope param");
  assert.ok(!url.searchParams.has("scope"), "should NOT have scope param");
});

test("user_scope includes reaction scopes", async () => {
  const { GET } = await import("./route");
  const req = new NextRequest("http://localhost/api/connectors/slack/oauth/start");
  const res = await GET(req);

  const location = res.headers.get("location")!;
  const url = new URL(location);
  const scopes = url.searchParams.get("user_scope")!.split(",");

  assert.ok(scopes.includes("reactions:read"), "should include reactions:read");
  assert.ok(scopes.includes("reactions:write"), "should include reactions:write");
  assert.ok(scopes.includes("groups:read"), "should include groups:read");
  assert.ok(scopes.includes("chat:write"), "should include chat:write");
});
