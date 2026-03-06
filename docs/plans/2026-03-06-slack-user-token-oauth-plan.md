# Slack User Token OAuth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Switch Slack OAuth from bot scopes (`scope`) to user scopes (`user_scope`) so non-admin users can authorize without workspace admin approval.

**Architecture:** The OAuth start route changes from `scope` to `user_scope` parameter. The callback route extracts the user token from `authed_user.access_token` instead of the top-level `access_token`. The manual token route also accepts `xoxp-` prefixed user tokens. Everything else (MCP registration, connector storage) stays the same.

**Tech Stack:** Next.js API routes (TypeScript), Slack OAuth v2 API, vitest + node:assert/strict

---

### Task 1: OAuth Start — Switch to `user_scope`

**Files:**
- Modify: `apps/web/src/app/api/connectors/slack/oauth/start/route.ts:29-39`
- Create: `apps/web/src/app/api/connectors/slack/oauth/start/route.test.ts`

**Step 1: Write the failing test**

Create `apps/web/src/app/api/connectors/slack/oauth/start/route.test.ts`:

```ts
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

  // Must use user_scope, not scope
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
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run apps/web/src/app/api/connectors/slack/oauth/start/route.test.ts`
Expected: FAIL — `should have user_scope param` fails because the route currently uses `scope`.

**Step 3: Write minimal implementation**

Edit `apps/web/src/app/api/connectors/slack/oauth/start/route.ts`. Replace lines 29-39:

```ts
  const scopes = [
    "chat:write",
    "channels:history",
    "groups:history",
    "channels:read",
    "groups:read",
    "users:read",
    "reactions:read",
    "reactions:write",
  ].join(",");
  const authorizeUrl = new URL("https://slack.com/oauth/v2/authorize");
  authorizeUrl.searchParams.set("client_id", oauthConfig.clientId);
  authorizeUrl.searchParams.set("user_scope", scopes);
  authorizeUrl.searchParams.set("redirect_uri", oauthConfig.redirectUri);
  authorizeUrl.searchParams.set("state", state);
```

Key changes:
- Line with `"users:read",` → add `"reactions:read",` and `"reactions:write",` after it
- `authorizeUrl.searchParams.set("scope", scopes)` → `authorizeUrl.searchParams.set("user_scope", scopes)`

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run apps/web/src/app/api/connectors/slack/oauth/start/route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/api/connectors/slack/oauth/start/route.ts apps/web/src/app/api/connectors/slack/oauth/start/route.test.ts
git commit -m "feat: switch Slack OAuth to user_scope for non-admin authorization"
```

---

### Task 2: OAuth Callback — Extract user token from `authed_user`

**Files:**
- Modify: `apps/web/src/app/api/connectors/slack/oauth/callback/route.ts:11-19,129,150-161`
- Create: `apps/web/src/app/api/connectors/slack/oauth/callback/route.test.ts`

**Step 1: Write the failing test**

Create `apps/web/src/app/api/connectors/slack/oauth/callback/route.test.ts`:

```ts
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
  vi.restoreAllMocks();
  mockConsumeOAuthState.mockResolvedValue({ returnTo: "/connectors" });
  mockUpsertConnector.mockResolvedValue(undefined);
  mockRegisterSlackMcp.mockResolvedValue(undefined);
});

test("extracts user token from authed_user.access_token", async () => {
  // Mock Slack oauth.v2.access response for user_scope flow
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
  const url = "http://localhost/api/connectors/slack/oauth/callback?code=test-code&state=test-state";
  const req = new NextRequest(url);
  const res = await GET(req);

  assert.equal(res.status, 302);
  const location = res.headers.get("location")!;
  assert.ok(location.includes("status=connected"), "should redirect with connected status");

  // Verify registerSlackMcp was called with the USER token
  assert.equal(mockRegisterSlackMcp.mock.calls.length, 1);
  assert.equal(mockRegisterSlackMcp.mock.calls[0][0].botToken, "xoxp-user-token-abc");
  assert.equal(mockRegisterSlackMcp.mock.calls[0][0].teamId, "T456");
});

test("redirects to error when authed_user.access_token is missing", async () => {
  const slackResponse = {
    ok: true,
    // No authed_user.access_token — simulates a response without user token
    team: { id: "T456", name: "Test Team" },
  };

  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: () => Promise.resolve(slackResponse),
    }),
  );

  const { GET } = await import("./route");
  const url = "http://localhost/api/connectors/slack/oauth/callback?code=test-code&state=test-state";
  const req = new NextRequest(url);
  const res = await GET(req);

  assert.equal(res.status, 302);
  const location = res.headers.get("location")!;
  assert.ok(location.includes("status=error"), "should redirect with error status");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run apps/web/src/app/api/connectors/slack/oauth/callback/route.test.ts`
Expected: FAIL — the route currently reads `oauthData.access_token` (top-level), not `authed_user.access_token`.

**Step 3: Write minimal implementation**

Edit `apps/web/src/app/api/connectors/slack/oauth/callback/route.ts`:

**a)** Update the `SlackOAuthResponse` interface (lines 11-19) to include `access_token` on `authed_user`:

```ts
interface SlackOAuthResponse {
  ok: boolean;
  error?: string;
  access_token?: string;
  token_type?: string;
  authed_user?: { id: string; access_token?: string };
  team?: { id: string; name: string };
  bot_user_id?: string;
}
```

**b)** Update the token extraction and validation (line 129). Replace:

```ts
  if (!oauthData.ok || !oauthData.access_token) {
```

with:

```ts
  const accessToken = oauthData.authed_user?.access_token ?? oauthData.access_token;
  if (!oauthData.ok || !accessToken) {
```

**c)** Update the `workspace` record (around line 150) — use `authed_user.id` instead of `bot_user_id`:

```ts
    workspace: {
      teamId: oauthData.team?.id,
      teamName: oauthData.team?.name,
      botUserId: oauthData.authed_user?.id ?? oauthData.bot_user_id,
    },
```

**d)** Update `registerSlackMcp` call (around line 161). Replace:

```ts
    await registerSlackMcp({ botToken: oauthData.access_token, teamId: oauthData.team.id });
```

with:

```ts
    await registerSlackMcp({ botToken: accessToken, teamId: oauthData.team.id });
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run apps/web/src/app/api/connectors/slack/oauth/callback/route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/api/connectors/slack/oauth/callback/route.ts apps/web/src/app/api/connectors/slack/oauth/callback/route.test.ts
git commit -m "feat: extract user token from authed_user in OAuth callback"
```

---

### Task 3: Token Route — Accept `xoxp-` prefix

**Files:**
- Modify: `apps/web/src/app/api/connectors/slack/token/route.ts:1-4,29-34`
- Create: `apps/web/src/app/api/connectors/slack/token/route.test.ts`

**Step 1: Write the failing test**

Create `apps/web/src/app/api/connectors/slack/token/route.test.ts`:

```ts
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
  vi.restoreAllMocks();
  mockUpsertConnector.mockResolvedValue(undefined);
  mockRegisterSlackMcp.mockResolvedValue(undefined);
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
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run apps/web/src/app/api/connectors/slack/token/route.test.ts`
Expected: FAIL — `xoxp-` token test returns 400 because the route only accepts `xoxb-`.

**Step 3: Write minimal implementation**

Edit `apps/web/src/app/api/connectors/slack/token/route.ts`:

**a)** Update the file doc comment (lines 1-4):

```ts
/**
 * Dev / quick-start: manually provide a Slack token instead of going through OAuth.
 * Accepts both bot tokens (xoxb-...) and user tokens (xoxp-...).
 */
```

**b)** Update the token validation (lines 29-34). Replace:

```ts
  if (!token?.startsWith("xoxb-")) {
    return NextResponse.json(
      { error: "Token must be a bot token starting with xoxb-" },
      { status: 400 },
    );
  }
```

with:

```ts
  if (!token?.startsWith("xoxb-") && !token?.startsWith("xoxp-")) {
    return NextResponse.json(
      { error: "Token must start with xoxb- or xoxp-" },
      { status: 400 },
    );
  }
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run apps/web/src/app/api/connectors/slack/token/route.test.ts`
Expected: PASS

**Step 5: Run all tests**

Run: `pnpm test`
Expected: All tests pass (except the 9 pre-existing StepNode.test.tsx failures unrelated to this change).

**Step 6: Commit**

```bash
git add apps/web/src/app/api/connectors/slack/token/route.ts apps/web/src/app/api/connectors/slack/token/route.test.ts
git commit -m "feat: accept xoxp- user tokens in manual token route"
```
