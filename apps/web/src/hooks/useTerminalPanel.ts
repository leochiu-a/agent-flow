"use client";

import { useCallback, useState } from "react";
import type { LogLine } from "@/components/WorkflowCanvas";

export function useTerminalPanel() {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [showTerminal, setShowTerminal] = useState(false);

  const openTerminal = useCallback(() => setShowTerminal(true), []);
  const closeTerminal = useCallback(() => setShowTerminal(false), []);

  const handleRunningChange = useCallback((nextRunning: boolean) => {
    if (nextRunning) {
      setShowTerminal(true);
    }
  }, []);

  return {
    lines,
    setLines,
    showTerminal,
    openTerminal,
    closeTerminal,
    handleRunningChange,
  };
}
