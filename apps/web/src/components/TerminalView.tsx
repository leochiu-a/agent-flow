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
    if (!filePath || running) return;
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
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        if (!part.trim()) continue;
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
          setLines((prev) => [...prev, { text: part, isError: false }]);
        }
      }
    }
    setRunning(false);
  };

  return (
    <main style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, minWidth: 0 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <span
          style={{
            fontSize: 12,
            color: filePath ? "#60a5fa" : "#444",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {filePath ?? "← Select a workflow from the sidebar"}
        </span>
        <button
          onClick={runWorkflow}
          disabled={running || !filePath}
          style={{
            background: running ? "#1a1a1a" : filePath ? "#1d4ed8" : "#222",
            color: filePath ? "#fff" : "#555",
            border: "1px solid #333",
            padding: "6px 18px",
            borderRadius: 4,
            cursor: running || !filePath ? "not-allowed" : "pointer",
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          {running ? "Running..." : "▶ Run"}
        </button>
      </div>

      <div
        style={{
          flex: 1,
          background: "#0a0a0a",
          border: "1px solid #1e1e1e",
          borderRadius: 4,
          padding: "12px 16px",
          overflowY: "auto",
          fontFamily: "monospace",
          fontSize: 12,
          lineHeight: 1.7,
        }}
      >
        {lines.length === 0 && (
          <span style={{ color: "#333" }}>Output will appear here after you click Run.</span>
        )}
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              whiteSpace: "pre-wrap",
              color:
                line.level === "error" || line.level === "stderr"
                  ? "#f87171"
                  : line.level === "tool_use"
                    ? "#fbbf24"
                    : line.level === "tool_result"
                      ? "#67e8f9"
                      : "#86efac",
            }}
          >
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </main>
  );
}
