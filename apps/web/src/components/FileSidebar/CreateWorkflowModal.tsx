"use client";

import { useState } from "react";

const DEFAULT_YAML = `name: "New Workflow"
workflow:
  - name: "Hello World"
    run: "echo 'Hello from Agent Flow!'"
`;

interface CreateWorkflowModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateWorkflowModal({ onClose, onCreated }: CreateWorkflowModalProps) {
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState(DEFAULT_YAML);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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

      onCreated();
    } catch (error) {
      setCreateError((error as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/30 px-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex w-full max-w-2xl flex-col gap-4 rounded-xl border border-border bg-white p-6 shadow-2xl shadow-black/10">
        <div className="text-sm font-semibold text-dark">Create New Workflow</div>

        <label className="flex flex-col gap-1 text-[11px] text-ink">
          File name
          <input
            autoFocus
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="my-workflow (.yaml added automatically)"
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-dark outline-none transition placeholder:text-placeholder focus:border-pink"
          />
        </label>

        <label className="flex flex-col gap-1 text-[11px] text-ink">
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
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-ink transition hover:border-muted-fg hover:text-dark"
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
  );
}
