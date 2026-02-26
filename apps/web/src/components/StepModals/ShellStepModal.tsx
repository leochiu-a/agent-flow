"use client";

import { useState } from "react";

interface ShellStepModalProps {
  initialTitle: string;
  initialCommand: string;
  saving: boolean;
  error: string | null;
  onSave: (title: string, command: string) => void;
  onCancel: () => void;
}

export function ShellStepModal({
  initialTitle,
  initialCommand,
  saving,
  error,
  onSave,
  onCancel,
}: ShellStepModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [command, setCommand] = useState(initialCommand);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isDirty = title !== initialTitle || command !== initialCommand;

  const handleCancel = () => {
    if (isDirty && !confirm("You have unsaved changes. Discard?")) return;
    onCancel();
  };

  const handleSave = () => {
    if (!title.trim()) {
      setValidationError("Step name is required.");
      return;
    }
    if (!command.trim()) {
      setValidationError("Shell command is required.");
      return;
    }
    setValidationError(null);
    onSave(title, command);
  };

  const displayError = validationError ?? error;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-orange">Shell Step</div>

      <label className="flex flex-col gap-1 text-[11px] text-ink">
        Step name
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Step title..."
          className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-dark outline-none transition placeholder:text-placeholder focus:border-orange"
        />
      </label>

      <label className="flex flex-col gap-1 text-[11px] text-ink">
        Shell command
        <textarea
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Enter shell command..."
          rows={10}
          className="resize-y rounded-md border border-border bg-surface px-2.5 py-2 font-mono text-[11px] leading-relaxed text-dark outline-none transition placeholder:text-placeholder focus:border-orange"
        />
      </label>

      {displayError && <div className="text-[11px] text-pink">{displayError}</div>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={handleCancel}
          className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs text-ink transition hover:border-muted-fg hover:text-dark"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="cursor-pointer rounded-md bg-orange px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange/90 disabled:cursor-not-allowed disabled:bg-disabled disabled:text-muted-fg"
        >
          {saving ? "Saving..." : "Save Step"}
        </button>
      </div>
    </div>
  );
}
