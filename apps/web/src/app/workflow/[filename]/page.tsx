"use client";

import { use } from "react";
import { WorkflowPage } from "@/components/WorkflowPage";

export default function WorkflowFilePage({ params }: { params: Promise<{ filename: string }> }) {
  const { filename } = use(params);
  return <WorkflowPage initialFile={decodeURIComponent(filename)} />;
}
