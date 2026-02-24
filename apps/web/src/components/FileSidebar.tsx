"use client";

import { useCallback, useEffect, useState } from "react";

interface FileSidebarProps {
  onSelectFile?: (filename: string, content: string) => void;
}

const DEFAULT_YAML = `name: "New Workflow"
workflow:
  - name: "Hello World"
    run: "echo 'Hello from Agent Flow!'"
`;

export function FileSidebar({ onSelectFile }: FileSidebarProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  const selectFile = async (filename: string) => {
    setSelected(filename);
    setFileContent(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/workflow/read?file=${encodeURIComponent(filename)}`);
      const data = (await res.json()) as { content?: string };
      const content = data.content ?? "";
      setFileContent(content || null);
      onSelectFile?.(filename, content);
    } catch {
      setFileContent(null);
    } finally {
      setLoading(false);
    }
  };

  const createFile = async () => {
    if (!newName.trim()) {
      setCreateError("請輸入檔案名稱");
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
        setCreateError(data.error ?? "建立失敗");
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
    <aside className="flex w-64 shrink-0 flex-col overflow-hidden border-r border-slate-800/80 bg-slate-950/70">
      <div className="flex items-center gap-2 border-b border-slate-800/80 px-3 py-2.5">
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          AI Workflows
        </span>

        <button
          type="button"
          onClick={() => {
            setShowCreate(true);
            setCreateError(null);
          }}
          title="新增 Workflow"
          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-700 text-sm leading-none text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-100"
        >
          +
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="px-3 py-4 text-[11px] leading-relaxed text-slate-500">
            尚無 workflow 檔案
            <br />點 + 建立第一個
          </div>
        ) : (
          files.map((filename) => (
            <button
              key={filename}
              type="button"
              onClick={() => void selectFile(filename)}
              className={`block w-full truncate border-l-2 px-3 py-2 text-left text-xs transition ${
                selected === filename
                  ? "border-cyan-400 bg-slate-900 text-slate-100"
                  : "border-transparent text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
              }`}
            >
              {filename}
            </button>
          ))
        )}
      </div>

      {selected && (
        <div className="max-h-56 overflow-y-auto border-t border-slate-800/80 px-3 py-2.5">
          <div className="mb-1.5 truncate text-[10px] font-semibold text-slate-500">{selected}</div>
          {loading ? (
            <div className="text-[11px] text-slate-500">載入中...</div>
          ) : (
            <pre className="m-0 whitespace-pre-wrap break-all text-[10px] leading-relaxed text-slate-400">
              {fileContent ?? "（無法讀取）"}
            </pre>
          )}
        </div>
      )}

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowCreate(false);
            }
          }}
        >
          <div className="flex w-full max-w-2xl flex-col gap-4 rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="text-sm font-semibold text-slate-100">建立新的 Workflow 檔案</div>

            <label className="flex flex-col gap-1 text-[11px] text-slate-400">
              檔案名稱
              <input
                autoFocus
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="my-workflow（自動加 .yaml）"
                className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
              />
            </label>

            <label className="flex flex-col gap-1 text-[11px] text-slate-400">
              YAML 內容
              <textarea
                value={newContent}
                onChange={(event) => setNewContent(event.target.value)}
                rows={12}
                className="resize-y rounded-md border border-slate-700 bg-slate-950 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-emerald-200 outline-none transition focus:border-emerald-400"
              />
            </label>

            {createError && <div className="text-[11px] text-rose-400">{createError}</div>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
              >
                取消
              </button>

              <button
                type="button"
                onClick={() => void createFile()}
                disabled={creating}
                className="rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {creating ? "建立中..." : "建立"}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
