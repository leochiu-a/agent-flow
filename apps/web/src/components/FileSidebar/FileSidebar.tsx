"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitBranch, Plug } from "lucide-react";

import type { LogLine } from "../WorkflowCanvas";
import { formatDuration } from "../../utils/time";
import { SidebarHeader } from "./SidebarHeader";
import { CreateWorkflowModal } from "./CreateWorkflowModal";
import { WorkflowItem } from "./WorkflowItem";
import type { SessionSummary, SessionDetail } from "./types";

interface FileSidebarProps {
  onSelectFile?: (filename: string, content: string) => void;
  onSelectSession?: (logLines: LogLine[], success: boolean) => void;
  savedContent?: { filename: string; content: string } | null;
  refreshKey?: number;
  runningFile?: string | null;
}

export function FileSidebar({
  onSelectFile,
  onSelectSession,
  savedContent,
  refreshKey,
  runningFile,
}: FileSidebarProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sessionsByFile, setSessionsByFile] = useState<Record<string, SessionSummary[]>>({});
  const [loadingSessions, setLoadingSessions] = useState<Set<string>>(new Set());
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const [loadingSessionDetail, setLoadingSessionDetail] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/workflow/list");
      const data = (await res.json()) as { workflows: string[] };
      setFiles(data.workflows ?? []);
    } catch {
      // ignore
    }
  }, []);

  const fetchSessions = useCallback(async (filename: string) => {
    setLoadingSessions((prev) => new Set(prev).add(filename));
    try {
      const res = await fetch(`/api/workflow/sessions?file=${encodeURIComponent(filename)}`);
      const data = (await res.json()) as { sessions: SessionSummary[] };
      setSessionsByFile((prev) => ({ ...prev, [filename]: data.sessions ?? [] }));
    } catch {
      setSessionsByFile((prev) => ({ ...prev, [filename]: [] }));
    } finally {
      setLoadingSessions((prev) => {
        const next = new Set(prev);
        next.delete(filename);
        return next;
      });
    }
  }, []);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  // Auto-expand running file
  useEffect(() => {
    if (runningFile) {
      setExpanded((prev) => new Set(prev).add(runningFile));
    }
  }, [runningFile]);

  // Refresh sessions for expanded workflows when refreshKey changes
  useEffect(() => {
    if (refreshKey === undefined || refreshKey === 0) return;
    expanded.forEach((filename) => {
      void fetchSessions(filename);
    });
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (savedContent && savedContent.filename === selected) {
      if (expanded.has(savedContent.filename)) {
        void fetchSessions(savedContent.filename);
      }
    }
  }, [savedContent, selected, expanded, fetchSessions]);

  const toggleExpand = async (filename: string) => {
    const willExpand = !expanded.has(filename);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) {
        next.delete(filename);
      } else {
        next.add(filename);
      }
      return next;
    });

    if (willExpand && !(filename in sessionsByFile)) {
      await fetchSessions(filename);
    }
  };

  const selectFile = async (filename: string) => {
    setSelected(filename);
    try {
      const res = await fetch(`/api/workflow/read?file=${encodeURIComponent(filename)}`);
      const data = (await res.json()) as { content?: string };
      onSelectFile?.(filename, data.content ?? "");
    } catch {
      // ignore
    }
  };

  const handleWorkflowClick = async (filename: string) => {
    await selectFile(filename);
    await toggleExpand(filename);
  };

  const handleSessionClick = async (sessionId: string, workflowFile: string) => {
    if (loadingSessionDetail) return;
    setLoadingSessionDetail(sessionId);
    setSelectedSession(sessionId);
    try {
      const res = await fetch(
        `/api/workflow/session/${encodeURIComponent(sessionId)}?file=${encodeURIComponent(workflowFile)}`,
      );
      if (!res.ok) return;
      const session = (await res.json()) as SessionDetail;

      const logLines: LogLine[] = session.logs.map((entry) => {
        const prefix = entry.step ? `[${entry.step}] ` : "";
        const toolPrefix = entry.level === "tool_use" ? "⚙ " : "";
        return { text: `${prefix}${toolPrefix}${entry.message}`, level: entry.level };
      });

      logLines.push({
        text: `\n── Workflow ${session.success ? "✓ SUCCESS" : "✗ FAILED"} (${formatDuration(session.durationMs)}) ──`,
        level: session.success ? "info" : "error",
      });

      onSelectSession?.(logLines, session.success);
    } finally {
      setLoadingSessionDetail(null);
    }
  };

  const handleDeleteSession = async (
    e: React.MouseEvent,
    sessionId: string,
    workflowFile: string,
  ) => {
    e.stopPropagation();
    if (!confirm("Delete this session record?")) return;

    setDeletingSession(sessionId);
    try {
      const res = await fetch(
        `/api/workflow/session/${encodeURIComponent(sessionId)}?file=${encodeURIComponent(workflowFile)}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        setSessionsByFile((prev) => ({
          ...prev,
          [workflowFile]: (prev[workflowFile] ?? []).filter((s) => s.id !== sessionId),
        }));
      } else {
        alert("Failed to delete. Please try again.");
      }
    } catch {
      alert("Failed to delete. Please try again.");
    } finally {
      setDeletingSession(null);
    }
  };

  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-hidden border-r border-border bg-white">
      <nav className="px-2 py-1.5 flex flex-col gap-0.5">
        <Link
          href="/"
          className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12px] transition hover:bg-surface ${
            pathname === "/" ? "bg-surface font-semibold text-pink" : "text-ink"
          }`}
        >
          <GitBranch size={14} className={pathname === "/" ? "text-pink" : "text-muted-fg"} />
          Workflows
        </Link>
        <Link
          href="/connectors"
          className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12px] transition hover:bg-surface ${
            pathname === "/connectors" ? "bg-surface font-semibold text-pink" : "text-ink"
          }`}
        >
          <Plug size={14} className={pathname === "/connectors" ? "text-pink" : "text-muted-fg"} />
          Connectors
        </Link>
      </nav>

      <SidebarHeader onCreateClick={() => setShowCreate(true)} />

      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="px-3 py-4 text-[11px] leading-relaxed text-muted-fg">
            No workflow files yet.
            <br />
            Click + to create one.
          </div>
        ) : (
          files.map((filename) => (
            <WorkflowItem
              key={filename}
              filename={filename}
              isSelected={selected === filename}
              isExpanded={expanded.has(filename)}
              isRunning={runningFile === filename}
              sessions={sessionsByFile[filename] ?? []}
              isLoadingSessions={loadingSessions.has(filename)}
              loadingSessionDetail={loadingSessionDetail}
              selectedSession={selectedSession}
              deletingSession={deletingSession}
              onWorkflowClick={() => void handleWorkflowClick(filename)}
              onSessionClick={(sessionId) => void handleSessionClick(sessionId, filename)}
              onDeleteSession={(e, sessionId) => void handleDeleteSession(e, sessionId, filename)}
            />
          ))
        )}
      </div>

      {showCreate && (
        <CreateWorkflowModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            void fetchFiles();
          }}
        />
      )}
    </aside>
  );
}
