"use client";

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Folder, FolderPlus, GitBranch, Plug, Trash2 } from "lucide-react";

import type { LogLine } from "../WorkflowCanvas";
import { formatDuration } from "../../utils/time";
import { SidebarHeader } from "./SidebarHeader";
import { CreateWorkflowDialog } from "./CreateWorkflowDialog";
import { FolderBrowserDialog } from "./FolderBrowserDialog";
import { WorkflowItem } from "./WorkflowItem";
import { SessionItem } from "./SessionItem";
import type { SessionSummary, SessionDetail, SessionSummaryWithWorkflow } from "./types";
import { Button } from "@/components/ui/button";

interface FileSidebarProps {
  onSelectFile?: (filename: string, content: string) => void;
  onSelectSession?: (logLines: LogLine[], success: boolean) => void;
  onSelectFolder?: (folderPath: string | null) => void;
  savedContent?: { filename: string; content: string } | null;
  refreshKey?: number;
  runningFile?: string | null;
  selectedFile?: string | null;
  selectedFolder?: string | null;
}

const FOLDERS_STORAGE_KEY = "agent-flow.folders";

function getFolderDisplayName(folderPath: string): string {
  const parts = folderPath.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? folderPath;
}

export function FileSidebar({
  onSelectFile,
  onSelectSession,
  onSelectFolder,
  savedContent,
  refreshKey,
  runningFile,
  selectedFile,
  selectedFolder,
}: FileSidebarProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sessionsByFile, setSessionsByFile] = useState<Record<string, SessionSummary[]>>({});
  const [loadingSessions, setLoadingSessions] = useState<Set<string>>(new Set());

  const [folders, setFolders] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [folderSessionList, setFolderSessionList] = useState<SessionSummaryWithWorkflow[]>([]);
  const [loadingFolderSessions, setLoadingFolderSessions] = useState(false);

  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const [loadingSessionDetail, setLoadingSessionDetail] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(true);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/workflow/list");
      const data = (await res.json()) as { workflows: string[] };
      setFiles(data.workflows ?? []);
    } catch {
      // ignore
    } finally {
      setLoadingFiles(false);
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

  const fetchFolderSessions = useCallback(async () => {
    setLoadingFolderSessions(true);
    try {
      const res = await fetch("/api/workflow/sessions/all");
      const data = (await res.json()) as { sessions: SessionSummaryWithWorkflow[] };
      setFolderSessionList(data.sessions ?? []);
    } catch {
      setFolderSessionList([]);
    } finally {
      setLoadingFolderSessions(false);
    }
  }, []);

  useEffect(() => {
    void fetchFiles();
    void fetchFolderSessions();
  }, [fetchFiles, fetchFolderSessions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(FOLDERS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      setFolders(parsed.filter((item): item is string => typeof item === "string"));
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    if (runningFile) {
      setExpanded((prev) => new Set(prev).add(runningFile));
    }
  }, [runningFile]);

  useEffect(() => {
    if (refreshKey === undefined || refreshKey === 0) return;

    expanded.forEach((filename) => {
      void fetchSessions(filename);
    });
    void fetchFolderSessions();
  }, [expanded, fetchFolderSessions, fetchSessions, refreshKey]);

  useEffect(() => {
    if (savedContent && expanded.has(savedContent.filename)) {
      void fetchSessions(savedContent.filename);
    }
  }, [savedContent, expanded, fetchSessions]);

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

  const toggleFolderExpand = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const selectFile = async (filename: string) => {
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
    await selectFile(workflowFile);

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

  const handleDeleteSession = async (e: MouseEvent, sessionId: string, workflowFile: string) => {
    e.stopPropagation();
    if (!confirm("Delete this session record?")) return;

    setDeletingSession(sessionId);
    try {
      const res = await fetch(
        `/api/workflow/session/${encodeURIComponent(sessionId)}?file=${encodeURIComponent(workflowFile)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        alert("Failed to delete. Please try again.");
        return;
      }

      setSessionsByFile((prev) => ({
        ...prev,
        [workflowFile]: (prev[workflowFile] ?? []).filter((session) => session.id !== sessionId),
      }));
      setFolderSessionList((prev) =>
        prev.filter(
          (session) => !(session.id === sessionId && session.workflowFile === workflowFile),
        ),
      );
    } catch {
      alert("Failed to delete. Please try again.");
    } finally {
      setDeletingSession(null);
    }
  };

  const addFolder = (folderPath: string) => {
    const trimmed = folderPath.trim();
    if (!trimmed) return;

    setFolders((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setExpandedFolders((prev) => new Set(prev).add(trimmed));
    onSelectFolder?.(trimmed);
  };

  const removeFolder = (folderPath: string) => {
    setFolders((prev) => prev.filter((folder) => folder !== folderPath));
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.delete(folderPath);
      return next;
    });

    if (selectedFolder === folderPath) {
      onSelectFolder?.(null);
    }
  };

  const sessionsByFolder = useMemo(() => {
    const grouped: Record<string, SessionSummaryWithWorkflow[]> = {};
    for (const session of folderSessionList) {
      if (!session.workingDirectory) continue;
      if (!grouped[session.workingDirectory]) {
        grouped[session.workingDirectory] = [];
      }
      grouped[session.workingDirectory]?.push(session);
    }
    return grouped;
  }, [folderSessionList]);

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

      <SidebarHeader onCreateClick={() => setShowCreate(true)} title="Workflow" />

      <div className="flex-1 overflow-y-auto">
        {!loadingFiles && files.length === 0 ? (
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
              isSelected={selectedFile === filename}
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

        <div className="mt-2 pt-2">
          <div className="flex items-center gap-1.5 px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-fg">
            Folder
            <Button
              variant="icon-border"
              size="icon-xs"
              onClick={() => setShowFolderBrowser(true)}
              className="ml-auto text-sm leading-none"
              aria-label="Browse folders"
              title="Browse folders"
            >
              <FolderPlus size={12} />
            </Button>
          </div>

          {folders.length === 0 ? (
            <div className="px-3 pb-3 text-[10px] text-muted-fg">
              No folders yet. Click Browse to add one.
            </div>
          ) : (
            folders.map((folderPath) => {
              const folderSessions = sessionsByFolder[folderPath] ?? [];
              const isExpanded = expandedFolders.has(folderPath);
              const folderName = getFolderDisplayName(folderPath);
              return (
                <div key={folderPath}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectFolder?.(folderPath);
                      toggleFolderExpand(folderPath);
                    }}
                    className={`group flex w-full items-center gap-1.5 border-l-2 px-2 py-2 text-left text-xs transition ${
                      selectedFolder === folderPath
                        ? "border-pink bg-pink-subtle text-dark"
                        : "border-transparent text-ink hover:bg-surface hover:text-dark"
                    }`}
                    title={folderName}
                  >
                    <ChevronRight
                      size={12}
                      className={`shrink-0 text-muted-fg transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
                    />
                    <Folder size={12} className="shrink-0 text-muted-fg" />
                    <span className="min-w-0 flex-1 truncate">{folderName}</span>
                    <span
                      role="button"
                      tabIndex={-1}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeFolder(folderPath);
                      }}
                      className="rounded p-0.5 text-muted-fg opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                      aria-label={`Remove folder ${folderName}`}
                    >
                      <Trash2 size={11} />
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="ml-4">
                      {loadingFolderSessions ? (
                        <div className="px-3 py-2 text-[10px] text-muted-fg">Loading...</div>
                      ) : folderSessions.length === 0 ? (
                        <div className="px-3 py-2 text-[10px] text-muted-fg">No sessions</div>
                      ) : (
                        folderSessions.map((session) => (
                          <SessionItem
                            key={`${session.workflowFile}-${session.id}`}
                            session={session}
                            workflowFile={session.workflowFile}
                            workflowLabel={session.workflowFile}
                            isLoading={loadingSessionDetail === session.id}
                            isActive={selectedSession === session.id}
                            isDeleting={deletingSession === session.id}
                            onClick={() =>
                              void handleSessionClick(session.id, session.workflowFile)
                            }
                            onDelete={(e) =>
                              void handleDeleteSession(e, session.id, session.workflowFile)
                            }
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <FolderBrowserDialog
        open={showFolderBrowser}
        initialPath={selectedFolder}
        onClose={() => setShowFolderBrowser(false)}
        onSelectFolder={addFolder}
      />

      <CreateWorkflowDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          void fetchFiles();
        }}
      />
    </aside>
  );
}
