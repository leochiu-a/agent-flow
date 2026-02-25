"use client";

import { useState } from "react";

interface ClaudeStepModalProps {
  initialTitle: string;
  initialPrompt: string;
  saving: boolean;
  error: string | null;
  onSave: (title: string, prompt: string) => void;
  onCancel: () => void;
}

export function ClaudeStepModal({
  initialTitle,
  initialPrompt,
  saving,
  error,
  onSave,
  onCancel,
}: ClaudeStepModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isDirty = title !== initialTitle || prompt !== initialPrompt;

  const handleCancel = () => {
    if (isDirty && !confirm("You have unsaved changes. Discard?")) return;
    onCancel();
  };

  const handleSave = () => {
    if (!title.trim()) {
      setValidationError("Step name is required.");
      return;
    }
    if (!prompt.trim()) {
      setValidationError("Prompt is required.");
      return;
    }
    setValidationError(null);
    onSave(title, prompt);
  };

  const displayError = validationError ?? error;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-pink">
        Claude Agent Step
      </div>

      <label className="flex flex-col gap-1 text-[11px] text-secondary">
        Step name
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Step title..."
          className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-dark outline-none transition placeholder:text-placeholder focus:border-pink"
        />
      </label>

      <label className="flex flex-col gap-1 text-[11px] text-secondary">
        Prompt
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter prompt for Claude..."
          rows={10}
          className="resize-y rounded-md border border-border bg-surface px-2.5 py-2 font-mono text-[11px] leading-relaxed text-dark outline-none transition placeholder:text-placeholder focus:border-pink"
        />
      </label>

      {displayError && <div className="text-[11px] text-pink">{displayError}</div>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-secondary transition hover:border-muted-fg hover:text-dark"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-pink px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-pink/90 disabled:cursor-not-allowed disabled:bg-disabled disabled:text-muted-fg"
        >
          {saving ? "Saving..." : "Save Step"}
        </button>
      </div>
    </div>
  );
}
