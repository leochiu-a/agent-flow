"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface RenameWorkflowDialogProps {
  open: boolean;
  workflowName: string | null;
  isRenaming: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmRename: (newName: string) => void;
}

export function RenameWorkflowDialog({
  open,
  workflowName,
  isRenaming,
  onOpenChange,
  onConfirmRename,
}: RenameWorkflowDialogProps) {
  const [inputValue, setInputValue] = useState(workflowName ?? "");

  useEffect(() => {
    if (open && workflowName) {
      setInputValue(workflowName);
    }
  }, [open, workflowName]);

  const trimmed = inputValue.trim();
  const canRename = trimmed.length > 0 && !isRenaming;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogTitle>Rename workflow</DialogTitle>
        <DialogDescription className="sr-only">
          Enter a new name for this workflow file.
        </DialogDescription>
        <input
          autoFocus
          role="textbox"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canRename) onConfirmRename(trimmed);
          }}
          className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none transition focus:border-ring"
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isRenaming}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={() => onConfirmRename(trimmed)} disabled={!canRename}>
            {isRenaming ? "Renaming..." : "Rename"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
