"use client";

import { useCallback, useEffect, useState } from "react";
import type { LogLine } from "./WorkflowCanvas";

interface FileSidebarProps {
  onSelectFile?: (filename: string, content: string) => void;
  onSelectSession?: (logLines: LogLine[], success: boolean) => void;
  savedContent?: { filename: string; content: string } | null;
  refreshKey?: number;
  runningFile?: string | null;
}

interface SessionSummary {
  id: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  success: boolean;
}

interface LogEntry {
  level: string;
  message: string;
  step?: string;
  timestamp: number;
}

interface SessionDetail {
  id: string;
  workflowFile: string;
  workflowName: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  success: boolean;
  logs: LogEntry[];
  result: {
    success: boolean;
    steps: Array<{ name: string; success: boolean; exitCode: number | null }>;
  };
}

const DEFAULT_YAML = `name: "New Workflow"
workflow:
  - name: "Hello World"
    run: "echo 'Hello from Agent Flow!'"
`;

function formatTime(epochMs: number): string {
  const d = new Date(epochMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
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
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState(DEFAULT_YAML);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
      // file was saved, re-fetch sessions if expanded
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
      const content = data.content ?? "";
      onSelectFile?.(filename, content);
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

      // Append summary line
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

  const createFile = async () => {
    if (!newName.trim()) {
      setCreateError("Please enter a file name.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/workflow/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), content: newContent }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setCreateError(data.error ?? "Failed to create.");
        return;
      }

      setShowCreate(false);
      setNewName("");
      setNewContent(DEFAULT_YAML);
      await fetchFiles();
    } catch (error) {
      setCreateError((error as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-hidden border-r border-border bg-white">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-fg">
          AI Workflows
        </span>

        <button
          type="button"
          onClick={() => {
            setShowCreate(true);
            setCreateError(null);
          }}
          title="New Workflow"
          className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-sm leading-none text-pink transition hover:border-pink hover:bg-pink hover:text-white"
        >
          +
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="px-3 py-4 text-[11px] leading-relaxed text-muted-fg">
            No workflow files yet.
            <br />
            Click + to create one.
          </div>
        ) : (
          files.map((filename) => {
            const isSelected = selected === filename;
            const isExpanded = expanded.has(filename);
            const sessions = sessionsByFile[filename] ?? [];
            const isLoadingSessions = loadingSessions.has(filename);
            const isRunning = runningFile === filename;

            return (
              <div key={filename}>
                {/* Workflow row */}
                <button
                  type="button"
                  onClick={() => void handleWorkflowClick(filename)}
                  className={`flex w-full items-center gap-1.5 border-l-2 px-2 py-2 text-left text-xs transition ${
                    isSelected
                      ? "border-pink bg-pink-subtle text-dark"
                      : "border-transparent text-secondary hover:bg-surface hover:text-dark"
                  }`}
                >
                  {/* Expand arrow */}
                  <span
                    className={`shrink-0 text-[10px] transition-transform duration-150 text-muted-fg ${isExpanded ? "rotate-90" : ""}`}
                  >
                    ▶
                  </span>

                  <span className="min-w-0 flex-1 truncate">{filename}</span>

                  {/* Running indicator */}
                  {isRunning && (
                    <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-pink animate-pulse" />
                  )}

                  {/* Session count badge */}
                  {filename in sessionsByFile && sessions.length > 0 && (
                    <span className="shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-semibold text-muted-fg">
                      {sessions.length}
                    </span>
                  )}
                </button>

                {/* Sessions list */}
                {isExpanded && (
                  <div className="border-l border-border ml-4">
                    {isLoadingSessions ? (
                      <div className="px-3 py-2 text-[10px] text-muted-fg">Loading...</div>
                    ) : sessions.length === 0 ? (
                      <div className="px-3 py-2 text-[10px] text-muted-fg">No sessions</div>
                    ) : (
                      sessions.map((session) => (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => void handleSessionClick(session.id, filename)}
                          disabled={loadingSessionDetail === session.id}
                          className="group flex w-full items-start gap-1.5 px-3 py-1.5 text-left transition hover:bg-surface disabled:opacity-60"
                        >
                          {/* Status dot */}
                          <span
                            className={`mt-0.5 shrink-0 h-1.5 w-1.5 rounded-full ${session.success ? "bg-emerald-500" : "bg-red-500"}`}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[10px] text-secondary">
                              {formatTime(session.startedAt)}
                            </div>
                            <div className="text-[9px] text-muted-fg">
                              {formatDuration(session.durationMs)}
                            </div>
                          </div>

                          {/* Delete button */}
                          <button
                            type="button"
                            title="Delete session"
                            disabled={deletingSession === session.id}
                            onClick={(e) => void handleDeleteSession(e, session.id, filename)}
                            className="shrink-0 opacity-0 group-hover:opacity-100 rounded p-0.5 text-muted-fg transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 16 16"
                              fill="currentColor"
                              className="h-3 w-3"
                            >
                              <path
                                fillRule="evenodd"
                                d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.712Z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-dark/30 px-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowCreate(false);
            }
          }}
        >
          <div className="flex w-full max-w-2xl flex-col gap-4 rounded-xl border border-border bg-white p-6 shadow-2xl shadow-black/10">
            <div className="text-sm font-semibold text-dark">Create New Workflow</div>

            <label className="flex flex-col gap-1 text-[11px] text-secondary">
              File name
              <input
                autoFocus
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="my-workflow (.yaml added automatically)"
                className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-dark outline-none transition placeholder:text-placeholder focus:border-pink"
              />
            </label>

            <label className="flex flex-col gap-1 text-[11px] text-secondary">
              YAML content
              <textarea
                value={newContent}
                onChange={(event) => setNewContent(event.target.value)}
                rows={12}
                className="resize-y rounded-md border border-border bg-surface px-2.5 py-2 font-mono text-[11px] leading-relaxed text-dark outline-none transition focus:border-pink"
              />
            </label>

            {createError && <div className="text-[11px] text-pink">{createError}</div>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-secondary transition hover:border-muted-fg hover:text-dark"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void createFile()}
                disabled={creating}
                className="rounded-md bg-pink px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-pink/90 disabled:cursor-not-allowed disabled:bg-disabled disabled:text-muted-fg"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
