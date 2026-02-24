"use client";

import { useEffect, useState } from "react";

interface WorkflowListResponse {
  workflows: string[];
  dir: string;
}

interface WorkflowSidebarProps {
  onSelect: (filePath: string) => void;
}

export function WorkflowSidebar({ onSelect }: WorkflowSidebarProps) {
  const [workflows, setWorkflows] = useState<string[]>([]);
  const [dir, setDir] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/workflow/list")
      .then((r) => r.json() as Promise<WorkflowListResponse>)
      .then((data) => {
        setWorkflows(data.workflows);
        setDir(data.dir);
      })
      .catch(console.error);
  }, []);

  const handleSelect = (file: string) => {
    const fullPath = `${dir}/${file}`;
    setSelected(file);
    onSelect(fullPath);
  };

  return (
    <aside
      style={{
        width: 260,
        borderRight: "1px solid #2a2a2a",
        padding: "16px 12px",
        overflowY: "auto",
        flexShrink: 0,
      }}
    >
      <h2
        style={{
          fontSize: 11,
          color: "#555",
          margin: "0 0 12px",
          textTransform: "uppercase",
          letterSpacing: 1.5,
        }}
      >
        Workflows
      </h2>

      {workflows.length === 0 && (
        <p style={{ color: "#444", fontSize: 12, lineHeight: 1.6 }}>
          No workflows found in
          <br />
          <code style={{ color: "#666", fontSize: 11 }}>{dir}</code>
        </p>
      )}

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {workflows.map((wf) => (
          <li key={wf}>
            <button
              onClick={() => handleSelect(wf)}
              style={{
                width: "100%",
                textAlign: "left",
                background: selected === wf ? "#1e3a5f" : "transparent",
                border: "none",
                color: selected === wf ? "#60a5fa" : "#aaa",
                padding: "8px 10px",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 13,
                marginBottom: 2,
              }}
            >
              {wf}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
