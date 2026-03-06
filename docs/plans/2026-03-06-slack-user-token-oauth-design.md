# Slack User Token OAuth — Bypass Admin Approval

**Date:** 2026-03-06
**Status:** Approved

## Problem

The current Slack connector uses bot OAuth scopes (`scope` parameter), which installs a Bot to the workspace. Many workspaces require admin approval for app installations, blocking non-admin users from connecting.

## Solution

Switch from bot scopes to user scopes (`user_scope` parameter). This produces a `xoxp-` user token that acts on behalf of the authorizing user, bypassing most admin approval requirements. Messages are sent as the user (not a bot).

## Changes

### 1. `apps/web/src/app/api/connectors/slack/oauth/start/route.ts`

Replace `scope` with `user_scope` in the authorize URL:

```diff
- authorizeUrl.searchParams.set("scope", scopes);
+ authorizeUrl.searchParams.set("user_scope", scopes);
```

Update scopes list to include reaction support:

```
chat:write, channels:history, groups:history, channels:read, groups:read,
users:read, reactions:read, reactions:write
```

### 2. `apps/web/src/app/api/connectors/slack/oauth/callback/route.ts`

When using `user_scope`, Slack OAuth v2 returns the user token at `authed_user.access_token` instead of the top-level `access_token`.

```diff
- const token = oauthData.access_token;
+ const token = oauthData.authed_user?.access_token;
```

Team info remains at `oauthData.team` (unchanged).

### 3. `apps/web/src/app/api/connectors/slack/token/route.ts`

Allow `xoxp-` prefix in addition to `xoxb-`:

```diff
- if (!token?.startsWith("xoxb-")) {
+ if (!token?.startsWith("xoxb-") && !token?.startsWith("xoxp-")) {
```

## What Does NOT Change

- `claudeSettingsManager.ts` — `SLACK_BOT_TOKEN` env var name stays the same; `@modelcontextprotocol/server-slack` accepts user tokens via this variable.
- `connectorStorage.ts` — `SlackConnectorRecord` schema unchanged.
- `connectorEnv.ts` — sync logic unchanged.

## Testing

### Unit Tests (new/modified)

1. `oauth/start` — verify authorize URL uses `user_scope` parameter and includes `reactions:read`, `reactions:write`
2. `oauth/callback` — verify token extracted from `authed_user.access_token`
3. `token/route` — verify `xoxp-` prefixed tokens are accepted

### Manual Verification

1. Non-admin user runs OAuth flow
2. Confirm `xoxp-` token obtained and registered
3. Run workflow targeting a private channel
4. Confirm message appears in channel sent as the user

## Risks

- If a workspace blocks ALL third-party OAuth (not just bot installations), this approach still won't work. This is rare but possible.
- User token scopes may differ slightly from bot token scopes in edge cases; the MCP server should handle both gracefully.
