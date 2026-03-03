"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export interface JiraStepFormData {
  title: string;
  jiraTicket: string;
  prompt: string;
  skipPermission: boolean;
}

interface JiraStepModalProps {
  initialTitle: string;
  initialJiraTicket: string;
  initialPrompt: string;
  initialSkipPermission?: boolean;
  saving: boolean;
  error: string | null;
  readOnly?: boolean;
  onSave: (data: JiraStepFormData) => void;
  onCancel: () => void;
}

export function JiraStepModal({
  initialTitle,
  initialJiraTicket,
  initialPrompt,
  initialSkipPermission = false,
  saving,
  error,
  readOnly = false,
  onSave,
  onCancel,
}: JiraStepModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [jiraTicket, setJiraTicket] = useState(initialJiraTicket);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [skipPermission, setSkipPermission] = useState(initialSkipPermission);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isDirty =
    title !== initialTitle ||
    jiraTicket !== initialJiraTicket ||
    prompt !== initialPrompt ||
    skipPermission !== initialSkipPermission;

  const handleCancel = () => {
    if (isDirty && !confirm("You have unsaved changes. Discard?")) return;
    onCancel();
  };

  const handleSave = () => {
    if (!title.trim()) {
      setValidationError("Step name is required.");
      return;
    }
    if (!jiraTicket.trim()) {
      setValidationError("Jira ticket ID or URL is required.");
      return;
    }
    setValidationError(null);
    onSave({ title, jiraTicket, prompt, skipPermission });
  };

  const displayError = validationError ?? error;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm font-semibold uppercase tracking-wide text-jira">
        Jira Ticket Step
      </div>

      <label className="flex flex-col gap-1 text-sm text-ink">
        Step name
        <input
          autoFocus={!readOnly}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Step title..."
          readOnly={readOnly}
          className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-dark outline-none transition placeholder:text-placeholder focus:border-jira read-only:bg-muted read-only:cursor-default"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-ink">
        Jira Ticket URL / ID
        <input
          value={jiraTicket}
          onChange={(e) => setJiraTicket(e.target.value)}
          placeholder="e.g. PROJ-123 or https://..."
          readOnly={readOnly}
          className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-dark outline-none transition placeholder:text-placeholder focus:border-jira read-only:bg-muted read-only:cursor-default"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-ink">
        Additional instructions (optional)
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Additional instructions for Claude..."
          rows={6}
          readOnly={readOnly}
          className="resize-y rounded-md border border-border bg-surface px-2.5 py-2 font-mono text-sm leading-relaxed text-dark outline-none transition placeholder:text-placeholder focus:border-jira read-only:bg-muted read-only:cursor-default"
        />
      </label>

      {!readOnly && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="skip-permission-jira"
            checked={skipPermission}
            onCheckedChange={(checked) => setSkipPermission(checked === true)}
            className="data-[state=checked]:bg-jira data-[state=checked]:border-jira"
          />
          <label
            htmlFor="skip-permission-jira"
            className="cursor-pointer select-none text-sm text-dark"
          >
            Skip permission check
            <span className="ml-1 text-muted-fg">(--dangerously-skip-permissions)</span>
          </label>
        </div>
      )}

      {displayError && <div className="text-sm text-pink">{displayError}</div>}

      <div className="flex justify-end gap-2">
        {readOnly ? (
          <Button variant="outline" size="sm" onClick={onCancel}>
            Close
          </Button>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="pink" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Step"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
