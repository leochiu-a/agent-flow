"use client";

import { useEffect, useRef, useState } from "react";
import type { LogEntry } from "@agent-flow/core";

interface DoneEvent {
  type: "done";
  success: boolean;
}

interface ErrorEvent {
  type: "error";
  message: string;
}

type StreamLine = LogEntry | DoneEvent | ErrorEvent;

interface TerminalViewProps {
  filePath: string | null;
}

export function TerminalView({ filePath }: TerminalViewProps) {
  const [lines, setLines] = useState<{ text: string; level: string }[]>([]);
  const [running, setRunning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const runWorkflow = async () => {
    if (!filePath || running) {
      return;
    }

    setLines([]);
    setRunning(true);

    const res = await fetch("/api/workflow/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath }),
    });

    if (!res.body) {
      setRunning(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        if (!part.trim()) {
          continue;
        }

        try {
          const parsed = JSON.parse(part) as StreamLine;
          if ("type" in parsed && parsed.type === "done") {
            setLines((prev) => [
              ...prev,
              {
                text: `\n── Workflow ${parsed.success ? "✓ SUCCESS" : "✗ FAILED"} ──`,
                level: parsed.success ? "info" : "error",
              },
            ]);
          } else if ("type" in parsed && parsed.type === "error") {
            setLines((prev) => [...prev, { text: `[ERROR] ${parsed.message}`, level: "error" }]);
          } else {
            const entry = parsed as LogEntry;
            const prefix = entry.step ? `[${entry.step}] ` : "";
            const toolPrefix = entry.level === "tool_use" ? "⚙ " : "";
            setLines((prev) => [
              ...prev,
              {
                text: `${prefix}${toolPrefix}${entry.message}`,
                level: entry.level,
              },
            ]);
          }
        } catch {
          setLines((prev) => [...prev, { text: part, level: "info" }]);
        }
      }
    }

    setRunning(false);
  };

  return (
    <main className="flex min-w-0 flex-1 flex-col p-4">
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`flex-1 truncate text-xs ${filePath ? "text-cyan-300" : "text-slate-600"}`}
        >
          {filePath ?? "← Select a workflow from the sidebar"}
        </span>

        <button
          type="button"
          onClick={runWorkflow}
          disabled={running || !filePath}
          className="shrink-0 rounded-md border border-slate-700 px-4 py-1.5 text-xs text-white transition enabled:bg-cyan-600 enabled:hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-500"
        >
          {running ? "Running..." : "▶ Run"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto rounded-md border border-slate-800 bg-slate-950 p-3 font-mono text-xs leading-relaxed">
        {lines.length === 0 && (
          <span className="text-slate-600">Output will appear here after you click Run.</span>
        )}

        {lines.map((line, index) => (
          <div
            key={`${line.level}-${index}`}
            className={`whitespace-pre-wrap ${
              line.level === "error" || line.level === "stderr"
                ? "text-rose-400"
                : line.level === "tool_use"
                  ? "text-amber-300"
                  : line.level === "tool_result"
                    ? "text-cyan-300"
                    : "text-emerald-300"
            }`}
          >
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </main>
  );
}
