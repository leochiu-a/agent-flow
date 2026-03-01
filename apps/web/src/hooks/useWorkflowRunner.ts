"use client";

import { useCallback, useState } from "react";
import type { LogEntry, WorkflowDefinition } from "@agent-flow/core";
import type { LogLine } from "@/components/WorkflowCanvas";

export function resolveClaudeSessionMode(
  steps: WorkflowDefinition["workflow"],
  existingMode?: WorkflowDefinition["claude_session"],
): WorkflowDefinition["claude_session"] | undefined {
  if (existingMode === "shared") return "shared";
  const claudeStepCount = steps.filter((step) => step.agent === "claude").length;
  return claudeStepCount > 1 ? "shared" : undefined;
}

interface UseWorkflowRunnerOptions {
  onLinesChange?: (updater: (prev: LogLine[]) => LogLine[]) => void;
  onRunningChange?: (running: boolean) => void;
}

interface RunOptions {
  definition: WorkflowDefinition;
  workflowFile?: string;
  workingDirectory?: string;
}

export function useWorkflowRunner({ onLinesChange, onRunningChange }: UseWorkflowRunnerOptions) {
  const [running, setRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);

  const runWorkflow = useCallback(
    async ({ definition, workflowFile, workingDirectory }: RunOptions) => {
      if (running) return;

      setRunning(true);
      setStopping(false);
      setSessionId(null);
      onRunningChange?.(true);
      onLinesChange?.(() => []);

      try {
        const res = await fetch("/api/workflow/run-definition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            definition,
            workflowFile: workflowFile ?? undefined,
            workingDirectory: workingDirectory ?? undefined,
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to start workflow (HTTP ${res.status})`);
        }

        if (!res.body) {
          throw new Error("Workflow stream is unavailable");
        }

        setSessionId(res.headers.get("X-Session-Id"));

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            if (!part.trim()) continue;

            try {
              const parsed = JSON.parse(part) as Record<string, unknown>;
              let line: LogLine;

              if (parsed.type === "done") {
                line = {
                  text: `\n── Workflow ${parsed.success ? "✓ SUCCESS" : "✗ FAILED"} ──`,
                  level: parsed.success ? "info" : "error",
                };
              } else if (parsed.type === "error") {
                line = { text: `[ERROR] ${parsed.message as string}`, level: "error" };
              } else {
                const entry = parsed as unknown as LogEntry;
                const prefix = entry.step ? `[${entry.step}] ` : "";
                const toolPrefix = entry.level === "tool_use" ? "⚙ " : "";
                line = { text: `${prefix}${toolPrefix}${entry.message}`, level: entry.level };
              }

              onLinesChange?.((prev) => [...prev, line]);
            } catch {
              // ignore malformed lines
            }
          }
        }
      } catch (error) {
        onLinesChange?.((prev) => [
          ...prev,
          { text: `[ERROR] ${(error as Error).message}`, level: "error" },
        ]);
      } finally {
        setSessionId(null);
        setStopping(false);
        setRunning(false);
        onRunningChange?.(false);
      }
    },
    [onLinesChange, onRunningChange, running],
  );

  const stopWorkflow = useCallback(async () => {
    if (!sessionId || stopping) return;
    setStopping(true);

    try {
      const res = await fetch("/api/workflow/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      onLinesChange?.((prev) => [...prev, { text: "[INFO] Stop signal sent.", level: "info" }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      onLinesChange?.((prev) => [
        ...prev,
        { text: `[ERROR] Failed to stop workflow: ${message}`, level: "error" },
      ]);
      setStopping(false);
    }
  }, [onLinesChange, sessionId, stopping]);

  return { running, sessionId, stopping, runWorkflow, stopWorkflow };
}
