"use client";

import { useState } from "react";
import { WorkflowSidebar } from "@/components/WorkflowSidebar";
import { TerminalView } from "@/components/TerminalView";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <WorkflowSidebar onSelect={setSelectedFile} />
      <TerminalView filePath={selectedFile} />
    </div>
  );
}
