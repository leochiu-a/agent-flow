"use client";

import { useEffect, useRef } from "react";
import type { LogLine } from "./WorkflowCanvas";

interface TerminalPanelProps {
  lines: LogLine[];
  running: boolean;
  onClose: () => void;
}

const levelColor: Record<string, string> = {
  info: "#86efac",
  stdout: "#86efac",
  stderr: "#f87171",
  error: "#f87171",
  tool_use: "#fbbf24",
  tool_result: "#67e8f9",
};

export function TerminalPanel({ lines, running, onClose }: TerminalPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#020617",
        borderTop: "1px solid #1e293b",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 14px",
          borderBottom: "1px solid #0f172a",
          flexShrink: 0,
        }}
      >
        <span
          style={{ fontSize: 11, color: "#475569", letterSpacing: 1, textTransform: "uppercase" }}
        >
          Output
        </span>
        {running && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: "#fbbf24",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#fbbf24",
                display: "inline-block",
                animation: "pulse 1s infinite",
              }}
            />
            running
          </span>
        )}
        <button
          onClick={onClose}
          title="Close output panel"
          style={{
            marginLeft: "auto",
            background: "transparent",
            border: "none",
            color: "#334155",
            cursor: "pointer",
            fontSize: 15,
            lineHeight: 1,
            padding: "0 4px",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#94a3b8")}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#334155")}
        >
          ✕
        </button>
      </div>

      {/* Log lines */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 16px",
          fontFamily: "monospace",
          fontSize: 12,
          lineHeight: 1.7,
        }}
      >
        {lines.length === 0 && (
          <span style={{ color: "#1e293b" }}>
            {running ? "Starting..." : "Output will appear here after you click Run."}
          </span>
        )}
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              whiteSpace: "pre-wrap",
              color: levelColor[line.level] ?? "#86efac",
            }}
          >
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
