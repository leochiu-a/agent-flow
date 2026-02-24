"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

export interface StepNodeData {
  title: string;
  type: "claude" | "shell";
  prompt: string;
  onUpdate: (id: string, updates: Partial<Pick<StepNodeData, "title" | "type" | "prompt">>) => void;
  onDelete: (id: string) => void;
  [key: string]: unknown;
}

export function StepNode({ id, data, selected }: NodeProps) {
  const d = data as StepNodeData;
  const isAgent = d.type === "claude";

  const borderColor = selected ? "#60a5fa" : isAgent ? "#2563eb" : "#16a34a";
  const accentColor = isAgent ? "#93c5fd" : "#86efac";
  const bgColor = isAgent ? "#0a1628" : "#0a180a";

  return (
    <div
      style={{
        background: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: 10,
        padding: "12px 14px",
        width: 280,
        boxShadow: selected ? `0 0 12px ${borderColor}44` : "0 2px 8px #00000066",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: "#374151",
          border: "2px solid #4b5563",
          width: 12,
          height: 12,
        }}
      />

      {/* Header: type selector + delete */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <select
          value={d.type}
          onChange={(e) => d.onUpdate(id, { type: e.target.value as "claude" | "shell" })}
          className="nodrag"
          style={{
            flex: 1,
            background: "#111",
            border: `1px solid ${accentColor}33`,
            color: accentColor,
            fontSize: 11,
            padding: "3px 6px",
            borderRadius: 4,
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="claude">⚙ Claude Agent</option>
          <option value="shell">$ Shell Command</option>
        </select>
        <button
          onClick={() => d.onDelete(id)}
          className="nodrag"
          title="Delete step"
          style={{
            background: "transparent",
            border: "none",
            color: "#4b5563",
            cursor: "pointer",
            fontSize: 15,
            padding: "0 2px",
            lineHeight: 1,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#f87171")}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#4b5563")}
        >
          ✕
        </button>
      </div>

      {/* Title input */}
      <input
        value={d.title}
        onChange={(e) => d.onUpdate(id, { title: e.target.value })}
        placeholder="Step title..."
        className="nodrag"
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          borderBottom: "1px solid #1e293b",
          color: "#e2e8f0",
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 10,
          outline: "none",
          padding: "4px 0",
          boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      />

      {/* Prompt / command textarea */}
      <textarea
        value={d.prompt}
        onChange={(e) => d.onUpdate(id, { prompt: e.target.value })}
        placeholder={isAgent ? "Enter prompt for Claude..." : "Enter shell command..."}
        className="nodrag nopan"
        rows={4}
        style={{
          width: "100%",
          background: "#050505",
          border: "1px solid #1e293b",
          color: "#94a3b8",
          fontSize: 11,
          resize: "vertical",
          padding: "8px",
          borderRadius: 6,
          fontFamily: "monospace",
          outline: "none",
          boxSizing: "border-box",
          lineHeight: 1.6,
        }}
      />

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: "#374151",
          border: "2px solid #4b5563",
          width: 12,
          height: 12,
        }}
      />
    </div>
  );
}
