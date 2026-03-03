"use client";

import { useCallback, useEffect } from "react";
import { ClaudeStepModal } from "./ClaudeStepModal";
import { JiraStepModal } from "./JiraStepModal";
import { SlackStepModal } from "./SlackStepModal";
import type { StepFormData } from "./ClaudeStepModal";
import type { JiraStepFormData } from "./JiraStepModal";
import type { SlackStepFormData } from "./SlackStepModal";

interface StepEditModalProps {
  stepId: string;
  stepType: "claude" | "jira" | "slack";
  initialTitle: string;
  initialPrompt: string;
  initialSkipPermission?: boolean;
  initialSkill?: string;
  initialJiraTicket?: string;
  initialSlackChannel?: string;
  initialSlackMessage?: string;
  saving: boolean;
  error: string | null;
  readOnly?: boolean;
  onSave: (id: string, data: StepFormData | JiraStepFormData | SlackStepFormData) => void;
  onClose: () => void;
}

export function StepEditModal({
  stepId,
  stepType,
  initialTitle,
  initialPrompt,
  initialSkipPermission,
  initialSkill,
  initialJiraTicket,
  initialSlackChannel,
  initialSlackMessage,
  saving,
  error,
  readOnly,
  onSave,
  onClose,
}: StepEditModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSave = useCallback(
    (data: StepFormData | JiraStepFormData | SlackStepFormData) => {
      onSave(stepId, data);
    },
    [stepId, onSave],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/30 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-2xl flex-col gap-4 rounded-xl border border-border bg-white p-6 shadow-2xl shadow-black/10">
        {stepType === "jira" ? (
          <JiraStepModal
            initialTitle={initialTitle}
            initialJiraTicket={initialJiraTicket ?? ""}
            initialPrompt={initialPrompt}
            initialSkipPermission={initialSkipPermission}
            saving={saving}
            error={error}
            readOnly={readOnly}
            onSave={handleSave}
            onCancel={onClose}
          />
        ) : stepType === "slack" ? (
          <SlackStepModal
            initialTitle={initialTitle}
            initialSlackChannel={initialSlackChannel ?? ""}
            initialSlackMessage={initialSlackMessage ?? ""}
            initialSkipPermission={initialSkipPermission}
            saving={saving}
            error={error}
            readOnly={readOnly}
            onSave={handleSave}
            onCancel={onClose}
          />
        ) : (
          <ClaudeStepModal
            initialTitle={initialTitle}
            initialPrompt={initialPrompt}
            initialSkipPermission={initialSkipPermission}
            initialSkill={initialSkill}
            saving={saving}
            error={error}
            readOnly={readOnly}
            onSave={handleSave}
            onCancel={onClose}
          />
        )}
      </div>
    </div>
  );
}
