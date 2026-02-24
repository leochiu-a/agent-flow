import { NextRequest } from "next/server";
import { WorkflowRunner } from "@agent-flow/core";
import type { WorkflowDefinition } from "@agent-flow/core";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { definition } = (await req.json()) as { definition: WorkflowDefinition };

  const stream = new ReadableStream({
    start(controller) {
      const runner = new WorkflowRunner();
      const encoder = new TextEncoder();

      runner.on("log", (entry) => {
        controller.enqueue(encoder.encode(JSON.stringify(entry) + "\n"));
      });

      runner.on("done", (result) => {
        controller.enqueue(encoder.encode(JSON.stringify({ type: "done", ...result }) + "\n"));
        controller.close();
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
