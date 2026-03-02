import fs from "fs/promises";
import path from "path";

function getConnectorsDir(): string {
  return path.join(process.cwd(), ".ai-workflows", ".connectors");
}

function getRecordsPath(): string {
  return path.join(getConnectorsDir(), "records.json");
}

async function ensureDirs(): Promise<void> {
  await fs.mkdir(getConnectorsDir(), { recursive: true });
}

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
  createdAt: number;
  updatedAt: number;
  lastCheckedAt?: number;
  lastError?: string;
}

export type ConnectorRecord = SlackConnectorRecord | JiraConnectorRecord;

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
