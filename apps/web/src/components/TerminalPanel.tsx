"use client";

import { useEffect, useRef } from "react";
import type { LogLine } from "./WorkflowCanvas";

interface TerminalPanelProps {
  lines: LogLine[];
  running: boolean;
  onClose: () => void;
}

const levelColorClass: Record<string, string> = {
  info: "text-emerald-700",
  stdout: "text-emerald-700",
  stderr: "text-red-600",
  error: "text-red-600",
  tool_use: "text-orange-600",
  tool_result: "text-sky-600",
};

export function TerminalPanel({ lines, running, onClose }: TerminalPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <section className="flex h-full flex-col border-t border-[#E5E7EB] bg-white">
      <div className="flex shrink-0 items-center gap-2 border-b border-[#E5E7EB] px-3.5 py-1.5">
        <span className="text-[11px] uppercase tracking-[0.14em] text-[#9CA3AF]">Output</span>

        {running && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-orange">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange" />
            running
          </span>
        )}

        <button
          type="button"
          onClick={onClose}
          title="Close output panel"
          className="ml-auto rounded px-1 text-sm text-[#9CA3AF] transition hover:text-pink"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#F9FAFB] px-4 py-3 font-mono text-xs leading-relaxed">
        {lines.length === 0 && (
          <span className="text-[#D1D5DB]">
            {running ? "Starting..." : "Output will appear here after you click Run."}
          </span>
        )}

        {lines.map((line, index) => (
          <div
            key={`${line.level}-${index}`}
            className={`whitespace-pre-wrap ${levelColorClass[line.level] ?? "text-emerald-700"}`}
          >
            {line.text}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>
    </section>
  );
}
