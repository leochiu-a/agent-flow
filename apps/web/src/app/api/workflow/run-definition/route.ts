import { NextRequest } from "next/server";
import { WorkflowRunner } from "@agent-flow/core";
import type { WorkflowDefinition, LogEntry, WorkflowResult } from "@agent-flow/core";
import { writeSession, generateSessionId } from "@/lib/sessionStorage";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { definition, workflowFile: wfFile } = (await req.json()) as {
    definition: WorkflowDefinition;
    workflowFile?: string;
  };

  const workflowFile = wfFile ?? "__unsaved__";
  const sessionId = generateSessionId();
  const startedAt = Date.now();
  const logs: LogEntry[] = [];

  const stream = new ReadableStream({
    start(controller) {
      const runner = new WorkflowRunner();
      const encoder = new TextEncoder();

      runner.on("log", (entry: LogEntry) => {
        logs.push(entry);
        controller.enqueue(encoder.encode(JSON.stringify(entry) + "\n"));
      });

      runner.on("done", (result: WorkflowResult) => {
        const endedAt = Date.now();
        controller.enqueue(encoder.encode(JSON.stringify({ type: "done", ...result }) + "\n"));
        controller.close();

        writeSession({
          id: sessionId,
          workflowFile,
          workflowName: definition.name ?? workflowFile,
          startedAt,
          endedAt,
          durationMs: endedAt - startedAt,
          success: result.success,
          trigger: "manual",
          logs,
          result,
        }).catch((err: Error) => console.error("[session] write error:", err));
      });

      runner.run(definition).catch((err: Error) => {
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: "error", message: err.message }) + "\n"),
        );
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
