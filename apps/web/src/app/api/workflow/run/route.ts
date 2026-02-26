import { NextRequest } from "next/server";
import { WorkflowRunner } from "@agent-flow/core";
import type { LogEntry, WorkflowResult } from "@agent-flow/core";
import path from "path";
import { writeSession, generateSessionId } from "@/lib/sessionStorage";
import { loadConnectorEnv } from "@/lib/connectorEnv";
import { registerRunner, unregisterRunner } from "@/lib/runnerRegistry";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { filePath } = (await req.json()) as { filePath: string };
  const workflowFile = path.basename(filePath);
  const sessionId = generateSessionId();
  const startedAt = Date.now();
  const logs: LogEntry[] = [];
  const connectorEnv = await loadConnectorEnv();
  let runner: WorkflowRunner | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const enqueueLine = (line: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(line) + "\n"));
        } catch {
          closed = true;
        }
      };

      const closeStream = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // Client may already be disconnected.
        }
      };

      runner = new WorkflowRunner({ env: connectorEnv });

      registerRunner(sessionId, runner);

      runner.on("log", (entry: LogEntry) => {
        logs.push(entry);
        enqueueLine(entry);
      });

      runner.on("done", (result: WorkflowResult) => {
        const endedAt = Date.now();
        unregisterRunner(sessionId);
        enqueueLine({ type: "done", ...result });
        closeStream();
        runner = null;

        writeSession({
          id: sessionId,
          workflowFile,
          workflowName: workflowFile,
          startedAt,
          endedAt,
          durationMs: endedAt - startedAt,
          success: result.success,
          trigger: "manual",
          logs,
          result,
        }).catch((err: Error) => console.error("[session] write error:", err));
      });

      runner.runFile(filePath).catch((err: Error) => {
        unregisterRunner(sessionId);
        enqueueLine({ type: "error", message: err.message });
        closeStream();
        runner = null;
      });
    },
    cancel() {
      runner?.abort();
      unregisterRunner(sessionId);
      runner = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
      "X-Session-Id": sessionId,
    },
  });
}
