"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export interface SlackStepFormData {
  title: string;
  slackChannel: string;
  slackMessage: string;
  skipPermission: boolean;
}

interface SlackStepModalProps {
  initialTitle: string;
  initialSlackChannel: string;
  initialSlackMessage: string;
  initialSkipPermission?: boolean;
  saving: boolean;
  error: string | null;
  readOnly?: boolean;
  onSave: (data: SlackStepFormData) => void;
  onCancel: () => void;
}

export function SlackStepModal({
  initialTitle,
  initialSlackChannel,
  initialSlackMessage,
  initialSkipPermission = false,
  saving,
  error,
  readOnly = false,
  onSave,
  onCancel,
}: SlackStepModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [slackChannel, setSlackChannel] = useState(initialSlackChannel);
  const [slackMessage, setSlackMessage] = useState(initialSlackMessage);
  const [skipPermission, setSkipPermission] = useState(initialSkipPermission);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isDirty =
    title !== initialTitle ||
    slackChannel !== initialSlackChannel ||
    slackMessage !== initialSlackMessage ||
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
    if (!slackChannel.trim()) {
      setValidationError("Channel is required.");
      return;
    }
    if (!slackMessage.trim()) {
      setValidationError("Message is required.");
      return;
    }
    setValidationError(null);
    onSave({ title, slackChannel, slackMessage, skipPermission });
  };

  const displayError = validationError ?? error;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm font-semibold uppercase tracking-wide text-slack">
        Slack Message Step
      </div>

      <label className="flex flex-col gap-1 text-sm text-ink">
        Step name
        <input
          autoFocus={!readOnly}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Step title..."
          readOnly={readOnly}
          className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-dark outline-none transition placeholder:text-placeholder focus:border-slack read-only:bg-muted read-only:cursor-default"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-ink">
        Channel
        <input
          value={slackChannel}
          onChange={(e) => setSlackChannel(e.target.value)}
          placeholder="e.g. #general or C01234567"
          readOnly={readOnly}
          className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-dark outline-none transition placeholder:text-placeholder focus:border-slack read-only:bg-muted read-only:cursor-default"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-ink">
        Message
        <textarea
          value={slackMessage}
          onChange={(e) => setSlackMessage(e.target.value)}
          placeholder="Message to send..."
          rows={4}
          readOnly={readOnly}
          className="resize-y rounded-md border border-border bg-surface px-2.5 py-2 font-mono text-sm leading-relaxed text-dark outline-none transition placeholder:text-placeholder focus:border-slack read-only:bg-muted read-only:cursor-default"
        />
      </label>

      {!readOnly && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="skip-permission-slack"
            checked={skipPermission}
            onCheckedChange={(checked) => setSkipPermission(checked === true)}
            className="data-[state=checked]:bg-slack data-[state=checked]:border-slack"
          />
          <label
            htmlFor="skip-permission-slack"
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
