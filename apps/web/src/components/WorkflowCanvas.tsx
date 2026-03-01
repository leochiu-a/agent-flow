"use client";

import { useCallback, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { Background, BackgroundVariant, Controls, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { dump as yamlDump } from "js-yaml";
import { StepNode } from "./StepNode";
import { StepEditModal } from "./StepModals/StepEditModal";
import type { StepNodeData } from "./StepNode";
import type { WorkflowGraph } from "@/hooks/useWorkflowGraph";

export interface LogLine {
  text: string;
  level: string;
}

interface WorkflowCanvasProps {
  graph: WorkflowGraph;
  activeFile?: string | null;
  onSave?: (filename: string, content: string) => void;
}

const nodeTypes = { step: StepNode };

export function WorkflowCanvas({ graph, activeFile, onSave }: WorkflowCanvasProps) {
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [isModalSaving, setIsModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const onRequestEdit = useCallback((id: string) => {
    setEditingStepId(id);
    setModalError(null);
  }, []);

  // Inject UI callbacks into node data for StepNode rendering
  const enhancedNodes = useMemo(
    () =>
      graph.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onRequestEdit,
          onDelete: graph.deleteNode,
        },
      })),
    [graph.nodes, onRequestEdit, graph.deleteNode],
  );

  const handleModalSave = useCallback(
    (id: string, title: string, prompt: string, skipPermission: boolean) => {
      setIsModalSaving(true);
      setModalError(null);

      graph.updateNode(id, { title, prompt, skipPermission });

      if (activeFile && onSave) {
        onSave(activeFile, yamlDump(graph.getDefinition()));
      }

      setEditingStepId(null);
      setIsModalSaving(false);
    },
    [activeFile, onSave, graph],
  );

  const editingNode = editingStepId ? graph.nodes.find((n) => n.id === editingStepId) : null;

  return (
    <div className="relative h-full w-full">
      {graph.nodeCount === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-placeholder">
          <Clock size={64} strokeWidth={1} />
          <div className="text-sm tracking-wide">
            {activeFile
              ? "Add a step above to start building your workflow"
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
          style={{
            background: "#FFFFFF",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
          }}
        />
      </ReactFlow>

      {editingNode && (
        <StepEditModal
          stepId={editingStepId!}
          initialTitle={(editingNode.data as StepNodeData).title}
          initialPrompt={(editingNode.data as StepNodeData).prompt}
          initialSkipPermission={(editingNode.data as StepNodeData).skipPermission}
          saving={isModalSaving}
          error={modalError}
          onSave={(id, title, prompt, skipPermission) =>
            handleModalSave(id, title, prompt, skipPermission)
          }
          onClose={() => {
            setEditingStepId(null);
            setModalError(null);
          }}
        />
      )}
    </div>
  );
}
