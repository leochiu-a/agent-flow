"use client";

import { useCallback, useEffect } from "react";
import { ClaudeStepModal } from "./ClaudeStepModal";
import type { StepFormData } from "./ClaudeStepModal";

interface StepEditModalProps {
  stepId: string;
  initialTitle: string;
  initialPrompt: string;
  initialSkipPermission?: boolean;
  initialSkill?: string;
  saving: boolean;
  error: string | null;
  readOnly?: boolean;
  onSave: (id: string, data: StepFormData) => void;
  onClose: () => void;
}

export function StepEditModal({
  stepId,
  initialTitle,
  initialPrompt,
  initialSkipPermission,
  initialSkill,
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
    (data: StepFormData) => {
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
      </div>
    </div>
  );
}
