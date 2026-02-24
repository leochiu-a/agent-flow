"use client";

import { useEffect, useRef } from "react";
import type { LogLine } from "./WorkflowCanvas";

interface TerminalPanelProps {
  lines: LogLine[];
  running: boolean;
  onClose: () => void;
}

const levelColorClass: Record<string, string> = {
  info: "text-emerald-300",
  stdout: "text-emerald-300",
  stderr: "text-rose-400",
  error: "text-rose-400",
  tool_use: "text-amber-300",
  tool_result: "text-cyan-300",
};

export function TerminalPanel({ lines, running, onClose }: TerminalPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <section className="flex h-full flex-col border-t border-slate-800 bg-slate-950/85">
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-900 px-3.5 py-1.5">
        <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Output</span>

        {running && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
            running
          </span>
        )}

        <button
          type="button"
          onClick={onClose}
          title="Close output panel"
          className="ml-auto rounded px-1 text-sm text-slate-500 transition hover:text-slate-300"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed">
        {lines.length === 0 && (
          <span className="text-slate-600">
            {running ? "Starting..." : "Output will appear here after you click Run."}
          </span>
        )}

        {lines.map((line, index) => (
          <div
            key={`${line.level}-${index}`}
            className={`whitespace-pre-wrap ${levelColorClass[line.level] ?? "text-emerald-300"}`}
          >
            {line.text}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>
    </section>
  );
}
