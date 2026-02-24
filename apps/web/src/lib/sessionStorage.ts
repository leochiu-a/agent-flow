import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { LogEntry, WorkflowResult } from "@agent-flow/core";

export interface SessionRecord {
  id: string;
  workflowFile: string;
  workflowName: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  success: boolean;
  trigger: "manual" | "api";
  logs: LogEntry[];
  result: WorkflowResult;
}

export interface SessionSummary {
  id: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  success: boolean;
}

function sanitizeName(input: string): string {
  // Only allow filename-safe characters, no path separators
  return path.basename(input).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getSessionsDir(workflowFile: string): string {
  const baseDir = path.join(process.cwd(), ".ai-workflows", ".sessions");
  return path.join(baseDir, sanitizeName(workflowFile));
}

function getSessionPath(workflowFile: string, sessionId: string): string {
  const dir = getSessionsDir(workflowFile);
  // UUIDs only contain hex digits and dashes, this is safe
  const safeId = sessionId.replace(/[^a-zA-Z0-9-]/g, "");
  return path.join(dir, `${safeId}.json`);
}

export async function writeSession(session: SessionRecord): Promise<void> {
  const dir = getSessionsDir(session.workflowFile);
  await fs.mkdir(dir, { recursive: true });
  const filePath = getSessionPath(session.workflowFile, session.id);
  await fs.writeFile(filePath, JSON.stringify(session, null, 2), "utf-8");
}

export async function listSessions(workflowFile: string): Promise<SessionSummary[]> {
  const dir = getSessionsDir(workflowFile);
  try {
    const entries = await fs.readdir(dir);
    const sessions: SessionSummary[] = [];

    for (const entry of entries) {
      if (!entry.endsWith(".json")) continue;
      const filePath = path.join(dir, entry);
      try {
        const raw = await fs.readFile(filePath, "utf-8");
        const record = JSON.parse(raw) as SessionRecord;
        sessions.push({
          id: record.id,
          startedAt: record.startedAt,
          endedAt: record.endedAt,
          durationMs: record.durationMs,
          success: record.success,
        });
      } catch {
        console.warn(`[sessions] Skipping corrupted session file: ${entry}`);
      }
    }

    return sessions.sort((a, b) => b.startedAt - a.startedAt);
  } catch {
    return [];
  }
}

export async function getSession(
  workflowFile: string,
  sessionId: string,
): Promise<SessionRecord | null> {
  const filePath = getSessionPath(workflowFile, sessionId);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as SessionRecord;
  } catch {
    return null;
  }
}

export async function deleteSession(workflowFile: string, sessionId: string): Promise<boolean> {
  const filePath = getSessionPath(workflowFile, sessionId);
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

export function generateSessionId(): string {
  return crypto.randomUUID();
}
