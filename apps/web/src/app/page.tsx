"use client";

import { useState } from "react";
import { WorkflowCanvas } from "@/components/WorkflowCanvas";
import { TerminalPanel } from "@/components/TerminalPanel";
import { FileSidebar } from "@/components/FileSidebar";
import type { LogLine } from "@/components/WorkflowCanvas";

export default function Home() {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);

  const handleRunningChange = (r: boolean) => {
    setRunning(r);
    if (r) setShowTerminal(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* Header */}
      <header
        style={{
          height: 44,
          borderBottom: "1px solid #0f172a",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          flexShrink: 0,
          background: "#020617",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: "#60a5fa", letterSpacing: 0.5 }}>
          ⚡ Agent Flow
        </span>
        <span style={{ fontSize: 11, color: "#334155", marginLeft: 12 }}>
          Visual Workflow Builder
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {lines.length > 0 && !showTerminal && (
            <button
              onClick={() => setShowTerminal(true)}
              style={{
                background: "transparent",
                border: "1px solid #334155",
                color: "#94a3b8",
                padding: "4px 10px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              Show Output
            </button>
          )}
        </div>
      </header>

      {/* Main content row: sidebar + canvas */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
        {/* File browser sidebar */}
        <FileSidebar />

        {/* Canvas + terminal column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Canvas */}
          <div
            style={{
              flex: showTerminal ? "0 0 62%" : 1,
              minHeight: 0,
              transition: "flex 0.25s ease",
            }}
          >
            <WorkflowCanvas onLinesChange={setLines} onRunningChange={handleRunningChange} />
          </div>

          {/* Terminal panel — slides in from bottom */}
          {showTerminal && (
            <div style={{ flex: "0 0 38%", minHeight: 0 }}>
              <TerminalPanel
                lines={lines}
                running={running}
                onClose={() => setShowTerminal(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
