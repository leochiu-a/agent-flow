"use client";

import { useCallback, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { Background, BackgroundVariant, Controls, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { dump as yamlDump } from "js-yaml";
import { StepNode } from "./StepNode";
import { StepEditModal } from "./StepModals/StepEditModal";
import type { StepFormData } from "./StepModals/ClaudeStepModal";
import type { StepNodeData } from "./StepNode";
import type { WorkflowGraph } from "@/hooks/useWorkflowGraph";

export interface LogLine {
  text: string;
  level: string;
}

interface WorkflowCanvasProps {
  graph: WorkflowGraph;
  activeFile?: string | null;
  readOnly?: boolean;
  onSave?: (filename: string, content: string) => void;
}

const nodeTypes = { step: StepNode };

export function WorkflowCanvas({ graph, activeFile, readOnly, onSave }: WorkflowCanvasProps) {
  const [modalState, setModalState] = useState<{ stepId: string; mode: "edit" | "preview" } | null>(
    null,
  );
  const [isModalSaving, setIsModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const onRequestEdit = useCallback((id: string) => {
    setModalState({ stepId: id, mode: "edit" });
    setModalError(null);
  }, []);

  const onRequestPreview = useCallback((id: string) => {
    setModalState({ stepId: id, mode: "preview" });
  }, []);

  // Inject UI callbacks into node data for StepNode rendering
  const enhancedNodes = useMemo(
    () =>
      graph.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          readOnly,
          onRequestEdit,
          onDelete: graph.deleteNode,
          onToggleDisabled: readOnly ? graph.toggleNodeDisabled : undefined,
          onRequestPreview: readOnly ? onRequestPreview : undefined,
        },
      })),
    [
      graph.nodes,
      readOnly,
      onRequestEdit,
      onRequestPreview,
      graph.deleteNode,
      graph.toggleNodeDisabled,
    ],
  );

  const handleModalSave = useCallback(
    (id: string, data: StepFormData) => {
      setIsModalSaving(true);
      setModalError(null);

      graph.updateNode(id, data);

      if (activeFile && onSave) {
        onSave(activeFile, yamlDump(graph.getDefinition()));
      }

      setModalState(null);
      setIsModalSaving(false);
    },
    [activeFile, onSave, graph],
  );

  const modalNode = modalState ? graph.nodes.find((n) => n.id === modalState.stepId) : null;

  return (
    <div className="relative h-full w-full">
      {graph.nodeCount === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-placeholder">
          <Clock size={64} strokeWidth={1} />
          <div className="text-sm tracking-wide">
            {activeFile
              ? "Click the + button to start building your workflow"
              : "Load a workflow to display it on canvas"}
          </div>
        </div>
      )}

      <ReactFlow
        nodes={enhancedNodes}
        edges={graph.edges}
        onNodesChange={graph.onNodesChange}
        onEdgesChange={graph.onEdgesChange}
        onConnect={graph.onConnect}
        nodeTypes={nodeTypes}
        proOptions={{ hideAttribution: true }}
        fitView
        fitViewOptions={{ padding: 0.4, maxZoom: 1 }}
        minZoom={0.3}
        style={{ background: "var(--color-canvas)" }}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: "var(--color-pink)", strokeWidth: 2 },
        }}
      >
        <Background
          color="var(--color-border)"
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1.5}
        />
        <Controls
          showInteractive={false}
          orientation="horizontal"
          style={{
            background: "#ffffff",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            padding: 4,
          }}
        />
      </ReactFlow>

      {modalNode && modalState && (
        <StepEditModal
          stepId={modalState.stepId}
          initialTitle={(modalNode.data as StepNodeData).title}
          initialPrompt={(modalNode.data as StepNodeData).prompt}
          initialSkipPermission={(modalNode.data as StepNodeData).skipPermission}
          initialSkill={(modalNode.data as StepNodeData).skill}
          saving={modalState.mode === "edit" ? isModalSaving : false}
          error={modalState.mode === "edit" ? modalError : null}
          readOnly={modalState.mode === "preview"}
          onSave={modalState.mode === "edit" ? handleModalSave : () => {}}
          onClose={() => {
            setModalState(null);
            setModalError(null);
          }}
        />
      )}
    </div>
  );
}
