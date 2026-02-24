"use client";

import { useEffect, useState, useCallback } from "react";

interface FileSidebarProps {
  onSelectFile?: (filename: string, filePath: string) => void;
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

  // Create modal state
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

  const selectFile = async (filename: string, dir: string) => {
    setSelected(filename);
    setFileContent(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/workflow/read?file=${encodeURIComponent(filename)}`);
      const data = (await res.json()) as { content?: string; error?: string };
      setFileContent(data.content ?? null);
      if (onSelectFile) {
        onSelectFile(filename, `${dir}/${filename}`);
      }
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
    } catch (e) {
      setCreateError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        borderRight: "1px solid #0f172a",
        background: "#020617",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Sidebar header */}
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid #0f172a",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{ fontSize: 11, color: "#475569", fontWeight: 600, flex: 1, letterSpacing: 0.5 }}
        >
          AI WORKFLOWS
        </span>
        <button
          onClick={() => {
            setShowCreate(true);
            setCreateError(null);
          }}
          title="新增 Workflow"
          style={{
            background: "transparent",
            border: "1px solid #1e293b",
            color: "#60a5fa",
            width: 22,
            height: 22,
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          +
        </button>
      </div>

      {/* File list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {files.length === 0 ? (
          <div style={{ padding: "16px 12px", fontSize: 11, color: "#334155", lineHeight: 1.6 }}>
            尚無 workflow 檔案
            <br />點 + 建立第一個
          </div>
        ) : (
          files.map((f) => (
            <button
              key={f}
              onClick={() => void selectFile(f, "")}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: selected === f ? "#0f172a" : "transparent",
                border: "none",
                borderLeft: selected === f ? "2px solid #60a5fa" : "2px solid transparent",
                color: selected === f ? "#e2e8f0" : "#64748b",
                padding: "7px 12px",
                fontSize: 12,
                cursor: "pointer",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {f}
            </button>
          ))
        )}
      </div>

      {/* File content preview */}
      {selected && (
        <div
          style={{
            borderTop: "1px solid #0f172a",
            padding: "10px 12px",
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          <div style={{ fontSize: 10, color: "#475569", marginBottom: 6, fontWeight: 600 }}>
            {selected}
          </div>
          {loading ? (
            <div style={{ fontSize: 11, color: "#334155" }}>載入中...</div>
          ) : (
            <pre
              style={{
                margin: 0,
                fontSize: 10,
                color: "#64748b",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                lineHeight: 1.6,
              }}
            >
              {fileContent ?? "（無法讀取）"}
            </pre>
          )}
        </div>
      )}

      {/* Create modal overlay */}
      {showCreate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreate(false);
          }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: 10,
              padding: 24,
              width: 480,
              maxWidth: "90vw",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>
              建立新的 Workflow 檔案
            </div>

            {/* Name input */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#64748b" }}>檔案名稱</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="my-workflow（自動加 .yaml）"
                style={{
                  background: "#020617",
                  border: "1px solid #1e293b",
                  borderRadius: 6,
                  color: "#e2e8f0",
                  padding: "6px 10px",
                  fontSize: 12,
                  outline: "none",
                }}
              />
            </div>

            {/* Content editor */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#64748b" }}>YAML 內容</label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={12}
                style={{
                  background: "#020617",
                  border: "1px solid #1e293b",
                  borderRadius: 6,
                  color: "#86efac",
                  padding: "8px 10px",
                  fontSize: 11,
                  fontFamily: "monospace",
                  resize: "vertical",
                  outline: "none",
                  lineHeight: 1.7,
                }}
              />
            </div>

            {createError && <div style={{ fontSize: 11, color: "#f87171" }}>{createError}</div>}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  background: "transparent",
                  border: "1px solid #334155",
                  color: "#64748b",
                  padding: "6px 14px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                取消
              </button>
              <button
                onClick={() => void createFile()}
                disabled={creating}
                style={{
                  background: creating ? "#1e3a5f" : "#1d4ed8",
                  color: "#fff",
                  border: "none",
                  padding: "6px 16px",
                  borderRadius: 6,
                  cursor: creating ? "not-allowed" : "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {creating ? "建立中..." : "建立"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
