"use client";

import { use } from "react";
import { WorkflowEditor } from "@/components/WorkflowEditor";

export default function WorkflowFilePage({ params }: { params: Promise<{ filename: string }> }) {
  const { filename } = use(params);

  return <WorkflowEditor initialFile={decodeURIComponent(filename)} />;
}
