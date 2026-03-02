import type { MouseEvent } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteWorkflowDialogProps {
  open: boolean;
  workflowName: string | null;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
}

export function DeleteWorkflowDialog({
  open,
  workflowName,
  isDeleting,
  onOpenChange,
  onConfirmDelete,
}: DeleteWorkflowDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm" onClick={(e: MouseEvent) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this workflow?</AlertDialogTitle>
          <AlertDialogDescription>
            {workflowName
              ? `This action cannot be undone. Are you sure you want to delete ${workflowName}? Session history will be kept.`
              : "Delete this workflow?"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirmDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
