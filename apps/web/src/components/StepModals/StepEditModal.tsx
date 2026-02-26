"use client";

import { useCallback, useEffect } from "react";
import { ClaudeStepModal } from "./ClaudeStepModal";
import { ShellStepModal } from "./ShellStepModal";

interface StepEditModalProps {
  stepId: string;
  stepType: "claude" | "shell";
  initialTitle: string;
  initialPrompt: string;
  initialSkipPermission?: boolean;
  saving: boolean;
  error: string | null;
  onSave: (id: string, title: string, prompt: string, skipPermission: boolean) => void;
  onClose: () => void;
}

export function StepEditModal({
  stepId,
  stepType,
  initialTitle,
  initialPrompt,
  initialSkipPermission,
  saving,
  error,
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
    (title: string, detail: string, skipPermission: boolean) => {
      onSave(stepId, title, detail, skipPermission);
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
        {stepType === "claude" ? (
          <ClaudeStepModal
            initialTitle={initialTitle}
            initialPrompt={initialPrompt}
            initialSkipPermission={initialSkipPermission}
            saving={saving}
            error={error}
            onSave={handleSave}
            onCancel={onClose}
          />
        ) : (
          <ShellStepModal
            initialTitle={initialTitle}
            initialCommand={initialPrompt}
            saving={saving}
            error={error}
            onSave={handleSave}
            onCancel={onClose}
          />
        )}
      </div>
    </div>
  );
}
