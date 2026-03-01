"use client";

import { use } from "react";
import { WorkflowPage } from "@/components/WorkflowPage";

export default function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <WorkflowPage initialFolderId={id} />;
}
