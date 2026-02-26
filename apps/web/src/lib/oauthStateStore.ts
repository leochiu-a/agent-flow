import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OAuthStateRecord {
  state: string; // random nonce
  provider: "slack";
  createdAt: number;
  expiresAt: number;
  returnTo?: string;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function getStatesDir(): string {
  return path.join(process.cwd(), ".ai-workflows", ".oauth-states");
}

function getStatePath(state: string): string {
  // state is a UUID — only hex + dashes allowed
  const safeState = state.replace(/[^a-zA-Z0-9-]/g, "");
  return path.join(getStatesDir(), `${safeState}.json`);
}

// ---------------------------------------------------------------------------
// returnTo allowlist: only relative paths within the same origin
// ---------------------------------------------------------------------------

export function isAllowedReturnTo(returnTo: string): boolean {
  // Must start with / and must NOT contain ://  (no external redirects)
  return returnTo.startsWith("/") && !returnTo.includes("://");
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function createOAuthState(returnTo?: string): Promise<string> {
  const state = crypto.randomUUID();
  const now = Date.now();
  const record: OAuthStateRecord = {
    state,
    provider: "slack",
    createdAt: now,
    expiresAt: now + STATE_TTL_MS,
    returnTo: returnTo && isAllowedReturnTo(returnTo) ? returnTo : undefined,
  };

  await fs.mkdir(getStatesDir(), { recursive: true });
  await fs.writeFile(getStatePath(state), JSON.stringify(record), {
    encoding: "utf-8",
    mode: 0o600,
  });
  return state;
}

export async function consumeOAuthState(state: string): Promise<OAuthStateRecord | null> {
  const filePath = getStatePath(state);
  let record: OAuthStateRecord;
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    record = JSON.parse(raw) as OAuthStateRecord;
  } catch {
    return null; // not found
  }

  // Always delete on consume (one-time use)
  await fs.unlink(filePath).catch(() => {});

  if (Date.now() > record.expiresAt) {
    return null; // expired
  }

  return record;
}

// ---------------------------------------------------------------------------
// Cleanup expired states (best-effort, called opportunistically)
// ---------------------------------------------------------------------------

export async function pruneExpiredStates(): Promise<void> {
  const dir = getStatesDir();
  try {
    const entries = await fs.readdir(dir);
    const now = Date.now();
    for (const entry of entries) {
      if (!entry.endsWith(".json")) continue;
      const filePath = path.join(dir, entry);
      try {
        const raw = await fs.readFile(filePath, "utf-8");
        const record = JSON.parse(raw) as OAuthStateRecord;
        if (now > record.expiresAt) {
          await fs.unlink(filePath).catch(() => {});
        }
      } catch {
        // Skip corrupted file
      }
    }
  } catch {
    // Directory may not exist yet
  }
}
