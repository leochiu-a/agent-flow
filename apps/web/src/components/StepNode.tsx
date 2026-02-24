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

  const tone = isAgent
    ? {
        card: "bg-white border-pink/40",
        focus: "border-pink shadow-[0_0_0_1px_rgba(234,75,113,0.6),0_0_24px_rgba(234,75,113,0.15)]",
        select: "border-pink/50 text-pink",
        textarea: "focus:border-pink text-[#374151]",
      }
    : {
        card: "bg-white border-orange/40",
        focus: "border-orange shadow-[0_0_0_1px_rgba(234,50,13,0.6),0_0_24px_rgba(234,50,13,0.12)]",
        select: "border-orange/50 text-orange",
        textarea: "focus:border-orange text-[#374151]",
      };

  return (
    <div
      className={`w-[280px] rounded-xl border-2 p-3.5 shadow-md shadow-black/8 transition ${tone.card} ${selected ? tone.focus : ""}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: "#FFFFFF",
          border: "2px solid #D1D5DB",
          width: 12,
          height: 12,
        }}
      />

      <div className="mb-2.5 flex items-center gap-2">
        <select
          value={d.type}
          onChange={(event) => d.onUpdate(id, { type: event.target.value as "claude" | "shell" })}
          className={`nodrag flex-1 rounded border bg-[#F9FAFB] px-2 py-1 text-[11px] outline-none transition ${tone.select}`}
        >
          <option value="claude">⚙ Claude Agent</option>
          <option value="shell">$ Shell Command</option>
        </select>

        <button
          type="button"
          onClick={() => d.onDelete(id)}
          className="nodrag rounded px-1 text-base leading-none text-[#9CA3AF] transition hover:text-pink"
          title="Delete step"
        >
          ✕
        </button>
      </div>

      <input
        value={d.title}
        onChange={(event) => d.onUpdate(id, { title: event.target.value })}
        placeholder="Step title..."
        className="nodrag mb-2.5 w-full border-0 border-b border-[#E5E7EB] bg-transparent px-0 py-1 text-sm font-semibold text-dark outline-none placeholder:text-[#D1D5DB] focus:border-[#9CA3AF]"
      />

      <textarea
        value={d.prompt}
        onChange={(event) => d.onUpdate(id, { prompt: event.target.value })}
        placeholder={isAgent ? "Enter prompt for Claude..." : "Enter shell command..."}
        className={`nodrag nopan w-full resize-y rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-2 font-mono text-[11px] leading-relaxed text-[#374151] outline-none transition placeholder:text-[#9CA3AF] ${tone.textarea}`}
        rows={4}
      />

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: "#FFFFFF",
          border: "2px solid #D1D5DB",
          width: 12,
          height: 12,
        }}
      />
    </div>
  );
}
