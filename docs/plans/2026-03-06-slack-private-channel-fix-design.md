# Fix: Slack MCP Cannot Send to Private Channels

**Date:** 2026-03-06
**Status:** Approved

## Problem

The Slack MCP bot cannot find or post to private (groups) channels. Claude reports a "channel not found" error when the target channel is private.

## Root Cause

`apps/web/src/app/api/connectors/slack/oauth/start/route.ts` requests these OAuth scopes:

```
chat:write, channels:history, groups:history, channels:read, users:read
```

The `groups:read` scope is missing. Without it, the bot cannot list or look up private channels, so the MCP server cannot resolve the channel ID and fails.

## Solution

Add `groups:read` to the OAuth scope list.

## Change

**File:** `apps/web/src/app/api/connectors/slack/oauth/start/route.ts`

```diff
 const scopes = [
   "chat:write",
   "channels:history",
   "groups:history",
   "channels:read",
+  "groups:read",
   "users:read",
 ].join(",");
```

## Impact

- New connections: automatically gain `groups:read` on first authorization.
- Existing connections: must reconnect via "Connect with Slack" to obtain the new scope.
- Public channel behavior: unchanged.

## Testing

Manual: reconnect Slack, then run a workflow step targeting a private channel — message should appear successfully.
