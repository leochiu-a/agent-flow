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
      .then((res) => res.json() as Promise<WorkflowListResponse>)
      .then((data) => {
        setWorkflows(data.workflows);
        setDir(data.dir);
      })
      .catch(console.error);
  }, []);

  const handleSelect = (file: string) => {
    setSelected(file);
    onSelect(`${dir}/${file}`);
  };

  return (
    <aside className="w-64 shrink-0 overflow-y-auto border-r border-slate-800 px-3 py-4">
      <h2 className="mb-3 text-[11px] uppercase tracking-[0.14em] text-slate-500">Workflows</h2>

      {workflows.length === 0 && (
        <p className="text-xs leading-relaxed text-slate-500">
          No workflows found in
          <br />
          <code className="text-[11px] text-slate-400">{dir}</code>
        </p>
      )}

      <ul className="m-0 list-none p-0">
        {workflows.map((workflow) => (
          <li key={workflow}>
            <button
              type="button"
              onClick={() => handleSelect(workflow)}
              className={`mb-1 w-full rounded px-2.5 py-2 text-left text-xs transition ${
                selected === workflow
                  ? "bg-cyan-950/70 text-cyan-200"
                  : "text-slate-300 hover:bg-slate-900 hover:text-slate-100"
              }`}
            >
              {workflow}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
