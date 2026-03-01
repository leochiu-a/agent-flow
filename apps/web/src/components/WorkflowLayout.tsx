"use client";

import type { ReactNode } from "react";

interface WorkflowLayoutProps {
  sidebar: ReactNode;
  canvas: ReactNode;
  terminal?: ReactNode;
  headerActions?: ReactNode;
}

export function WorkflowLayout({ sidebar, canvas, terminal, headerActions }: WorkflowLayoutProps) {
  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-canvas text-dark">
      <header className="flex h-12 shrink-0 items-center border-b border-border bg-white px-4 shadow-sm">
        <span className="text-sm font-bold tracking-wide text-pink">AGENT FLOW</span>
        <div className="ml-auto flex items-center gap-2">{headerActions}</div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {sidebar}

        <div className="flex min-w-0 flex-1 flex-col">
          <div
            className={`min-h-0 transition-all duration-300 ${terminal ? "basis-[62%]" : "flex-1"}`}
          >
            {canvas}
          </div>

          {terminal && <div className="min-h-0 basis-[38%]">{terminal}</div>}
        </div>
      </div>
    </div>
  );
}
