"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface ClaudeStepModalProps {
  initialTitle: string;
  initialPrompt: string;
  initialSkipPermission?: boolean;
  saving: boolean;
  error: string | null;
  onSave: (title: string, prompt: string, skipPermission: boolean) => void;
  onCancel: () => void;
}

export function ClaudeStepModal({
  initialTitle,
  initialPrompt,
  initialSkipPermission = false,
  saving,
  error,
  onSave,
  onCancel,
}: ClaudeStepModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [skipPermission, setSkipPermission] = useState(initialSkipPermission);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isDirty =
    title !== initialTitle || prompt !== initialPrompt || skipPermission !== initialSkipPermission;

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
    onSave(title, prompt, skipPermission);
  };

  const displayError = validationError ?? error;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-pink">
        Claude Agent Step
      </div>

      <label className="flex flex-col gap-1 text-[11px] text-ink">
        Step name
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Step title..."
          className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-dark outline-none transition placeholder:text-placeholder focus:border-pink"
        />
      </label>

      <label className="flex flex-col gap-1 text-[11px] text-ink">
        Prompt
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter prompt for Claude..."
          rows={10}
          className="resize-y rounded-md border border-border bg-surface px-2.5 py-2 font-mono text-[11px] leading-relaxed text-dark outline-none transition placeholder:text-placeholder focus:border-pink"
        />
      </label>

      <div className="flex items-center gap-2">
        <Checkbox
          id="skip-permission"
          checked={skipPermission}
          onCheckedChange={(checked) => setSkipPermission(checked === true)}
          className="data-[state=checked]:bg-pink data-[state=checked]:border-pink"
        />
        <label
          htmlFor="skip-permission"
          className="cursor-pointer select-none text-[11px] text-dark"
        >
          Skip permission check
          <span className="ml-1 text-muted-fg">(--dangerously-skip-permissions)</span>
        </label>
      </div>

      {displayError && <div className="text-[11px] text-pink">{displayError}</div>}

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="pink" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Step"}
        </Button>
      </div>
    </div>
  );
}
