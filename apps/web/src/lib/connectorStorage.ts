import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function getConnectorsDir(): string {
  return path.join(process.cwd(), ".ai-workflows", ".connectors");
}

function getRecordsPath(): string {
  return path.join(getConnectorsDir(), "records.json");
}

function getSecretsDir(): string {
  return path.join(getConnectorsDir(), "secrets");
}

function getSecretPath(connectionId: string): string {
  const safeId = sanitizeConnectionId(connectionId);
  return path.join(getSecretsDir(), `${safeId}.enc`);
}

function getKeyFilePath(): string {
  return path.join(getConnectorsDir(), ".key");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConnectorStatus = "connected" | "disconnected" | "error" | "connecting";

export interface SlackConnectorRecord {
  id: string;
  type: "slack";
  name: string;
  status: ConnectorStatus;
  workspace: {
    teamId?: string;
    teamName?: string;
    botUserId?: string;
  };
  mcpProfile: {
    serverName: "slack";
    transport: "stdio";
  };
  secretRef: string; // encrypted token ref only — never the raw token
  createdAt: number;
  updatedAt: number;
  lastCheckedAt?: number;
  lastError?: string;
}

export interface JiraConnectorRecord {
  id: string;
  type: "jira";
  authMode: "manual";
  name: string;
  status: ConnectorStatus;
  workspace: {
    siteUrl: string;
    email: string;
    accountId?: string;
    displayName?: string;
  };
  secretRef: string;
  createdAt: number;
  updatedAt: number;
  lastCheckedAt?: number;
  lastError?: string;
}

export type ConnectorRecord = SlackConnectorRecord | JiraConnectorRecord;

/** Jira manual token secret stored as encrypted JSON. */
export interface JiraTokenBundle {
  version: 2;
  provider: "jira";
  authMode: "manual";
  apiToken: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeConnectionId(id: string): string {
  // Allow only alphanumeric, underscore, hyphen
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(`Invalid connectionId: ${id}`);
  }
  return id;
}

async function ensureDirs(): Promise<void> {
  await fs.mkdir(getConnectorsDir(), { recursive: true });
  await fs.mkdir(getSecretsDir(), { recursive: true });
}

// ---------------------------------------------------------------------------
// Encryption key management
// ---------------------------------------------------------------------------

async function getMasterKey(): Promise<Buffer> {
  const envKey = process.env.CONNECTOR_MASTER_KEY;
  if (envKey) {
    const key = Buffer.from(envKey, "base64");
    if (key.length !== 32)
      throw new Error("CONNECTOR_MASTER_KEY must be 32 bytes (base64-encoded)");
    return key;
  }

  // Auto-generate and persist a local key (single-user dev mode)
  const keyFile = getKeyFilePath();
  try {
    const raw = await fs.readFile(keyFile, "utf-8");
    return Buffer.from(raw.trim(), "base64");
  } catch {
    console.warn(
      "[connector] CONNECTOR_MASTER_KEY not set — generating local key (not suitable for production)",
    );
    const newKey = crypto.randomBytes(32);
    await fs.mkdir(getConnectorsDir(), { recursive: true });
    await fs.writeFile(keyFile, newKey.toString("base64"), { encoding: "utf-8", mode: 0o600 });
    return newKey;
  }
}

// ---------------------------------------------------------------------------
// Secret encryption / decryption
// ---------------------------------------------------------------------------

interface EncryptedSecret {
  iv: string;
  authTag: string;
  ciphertext: string;
}

async function encryptSecret(plaintext: string): Promise<EncryptedSecret> {
  const key = await getMasterKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  return {
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: encrypted.toString("base64"),
  };
}

async function decryptSecret(enc: EncryptedSecret): Promise<string> {
  const key = await getMasterKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(enc.iv, "base64"));
  decipher.setAuthTag(Buffer.from(enc.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(enc.ciphertext, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf-8");
}

// ---------------------------------------------------------------------------
// Secret store
// ---------------------------------------------------------------------------

export async function saveSecret(connectionId: string, token: string): Promise<string> {
  await ensureDirs();
  const enc = await encryptSecret(token);
  const secretPath = getSecretPath(connectionId);
  await fs.writeFile(secretPath, JSON.stringify(enc), { encoding: "utf-8", mode: 0o600 });
  return secretPath; // used as secretRef
}

export async function loadSecret(connectionId: string): Promise<string> {
  const secretPath = getSecretPath(connectionId);
  const raw = await fs.readFile(secretPath, "utf-8");
  const enc = JSON.parse(raw) as EncryptedSecret;
  return decryptSecret(enc);
}

export async function deleteSecret(connectionId: string): Promise<void> {
  const secretPath = getSecretPath(connectionId);
  try {
    await fs.unlink(secretPath);
  } catch {
    // Ignore if already deleted
  }
}

// ---------------------------------------------------------------------------
// Connector record store
// ---------------------------------------------------------------------------

async function readRecords(): Promise<ConnectorRecord[]> {
  try {
    const raw = await fs.readFile(getRecordsPath(), "utf-8");
    return JSON.parse(raw) as ConnectorRecord[];
  } catch {
    return [];
  }
}

async function writeRecords(records: ConnectorRecord[]): Promise<void> {
  await ensureDirs();
  await fs.writeFile(getRecordsPath(), JSON.stringify(records, null, 2), "utf-8");
}

export async function listConnectors(): Promise<ConnectorRecord[]> {
  return readRecords();
}

export async function getConnector(connectionId: string): Promise<ConnectorRecord | null> {
  const records = await readRecords();
  return records.find((r) => r.id === connectionId) ?? null;
}

export async function upsertConnector(record: ConnectorRecord): Promise<void> {
  const records = await readRecords();
  const idx = records.findIndex((r) => r.id === record.id);
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.push(record);
  }
  await writeRecords(records);
}

export async function updateConnectorStatus(
  connectionId: string,
  status: ConnectorStatus,
  extra?: { lastCheckedAt?: number; lastError?: string },
): Promise<void> {
  const records = await readRecords();
  const rec = records.find((r) => r.id === connectionId);
  if (!rec) throw new Error(`Connector not found: ${connectionId}`);
  rec.status = status;
  rec.updatedAt = Date.now();
  if (extra?.lastCheckedAt !== undefined) rec.lastCheckedAt = extra.lastCheckedAt;
  if (extra?.lastError !== undefined) rec.lastError = extra.lastError;
  await writeRecords(records);
}

// ---------------------------------------------------------------------------
// Jira token bundle helpers
// ---------------------------------------------------------------------------

export async function saveJiraTokenBundle(
  connectionId: string,
  bundle: JiraTokenBundle,
): Promise<string> {
  return saveSecret(connectionId, JSON.stringify(bundle));
}

export async function loadJiraTokenBundle(connectionId: string): Promise<JiraTokenBundle> {
  const raw = await loadSecret(connectionId);
  return JSON.parse(raw) as JiraTokenBundle;
}
