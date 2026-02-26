"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { OutputLoadingIndicator } from "./OutputLoadingIndicator";
import type { LogLine } from "./WorkflowCanvas";
import { useCopyToClipboard } from "usehooks-ts";

// Typewriter for the "Agent is thinking" headline
function useTypewriter(text: string, speed = 48): string {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return displayed;
}

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

const STALL_THRESHOLD_MS = 3000;

export function TerminalPanel({ lines, running, onClose }: TerminalPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const headline = useTypewriter(lines.length === 0 && running ? "Agent is thinking..." : "", 55);
  const [copiedText, copy] = useCopyToClipboard();

  const handleCopy = () => {
    copy(lines.map((l) => l.text).join("\n"));
  };

  // Track when the last log line arrived to detect stalls
  const [lastLineAt, setLastLineAt] = useState<number | null>(null);
  const [isStalled, setIsStalled] = useState(false);

  // Show the loading row while running; keep it visible 300 ms after completion
  // to avoid an abrupt flash when the last log and running=false land together.
  const [showLoading, setShowLoading] = useState(false);

  // Update lastLineAt whenever a new line arrives
  useEffect(() => {
    if (lines.length > 0) {
      setLastLineAt(Date.now());
      setIsStalled(false);
    }
  }, [lines.length]);

  // Stall detector — re-arms every time lastLineAt changes
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => setIsStalled(true), STALL_THRESHOLD_MS);
    return () => clearTimeout(id);
  }, [running, lastLineAt]);

  // Show loading row immediately when running starts; hide with 300 ms delay after stop
  useEffect(() => {
    if (running) {
      setShowLoading(true);
    } else {
      const id = setTimeout(() => {
        setShowLoading(false);
        setIsStalled(false);
        setLastLineAt(null);
      }, 300);
      return () => clearTimeout(id);
    }
  }, [running]);

  // Auto-scroll to bottom on new lines or loading row changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, showLoading]);

  return (
    <section className="flex h-full flex-col border-t border-border bg-white">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3.5 py-1.5">
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-fg">Output</span>

        {running && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-orange">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange" />
            running
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          {lines.length > 0 && (
            <button
              type="button"
              onClick={handleCopy}
              title="Copy output"
              className="cursor-pointer rounded-md p-1 text-muted-fg transition hover:bg-black/5 hover:text-pink"
            >
              {copiedText ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Close output panel"
            className="cursor-pointer rounded-md p-1 text-muted-fg transition hover:bg-black/5 hover:text-pink"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-surface px-4 py-3 font-mono text-xs leading-relaxed">
        {/* Empty state — replace "Starting…" with the loading indicator */}
        {lines.length === 0 && !showLoading && (
          <span className="text-placeholder">Output will appear here after you click Run.</span>
        )}

        {lines.length === 0 && showLoading && (
          <div className="flex flex-col gap-2">
            {/* Typewriter headline */}
            <span className="text-[11px] text-muted-fg">
              {headline}
              <span
                aria-hidden="true"
                className="loading-cursor ml-0.5 inline-block h-[9px] w-[5px] rounded-sm bg-muted-fg opacity-60"
              />
            </span>
            <OutputLoadingIndicator visible stalled={isStalled} />
          </div>
        )}

        {lines.map((line, index) => (
          <div
            key={`${line.level}-${index}`}
            className={`whitespace-pre-wrap ${levelColorClass[line.level] ?? "text-emerald-700"}`}
          >
            {line.text}
          </div>
        ))}

        {/* Live loading row — sits below all log lines while running */}
        {lines.length > 0 && <OutputLoadingIndicator visible={showLoading} stalled={isStalled} />}

        <div ref={bottomRef} />
      </div>
    </section>
  );
}
