"use client";

import { useCallback, useRef } from "react";
import {
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type OnNodesChange,
  type OnEdgesChange,
} from "@xyflow/react";
import type { WorkflowDefinition } from "@agent-flow/core";
import type { StepNodeData } from "@/components/StepNode";
import { resolveClaudeSessionMode } from "@/hooks/useWorkflowRunner";

const EDGE_STYLE = { stroke: "var(--color-pink)", strokeWidth: 2 };

const newId = () => `step-${crypto.randomUUID().slice(0, 8)}`;

export interface WorkflowGraph {
  // ReactFlow rendering
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange<Node>;
  onEdgesChange: OnEdgesChange<Edge>;
  onConnect: (connection: Connection) => void;

  // Toolbar actions
  addNode: () => void;
  getDefinition: () => WorkflowDefinition;
  nodeCount: number;

  // Graph mutations
  deleteNode: (id: string) => void;
  updateNode: (
    id: string,
    data: Partial<Pick<StepNodeData, "title" | "prompt" | "skipPermission">>,
  ) => void;

  // Load workflow
  loadDefinition: (definition: WorkflowDefinition | null) => void;
}

interface UseWorkflowGraphOptions {
  activeFile?: string | null;
  claudeSession?: WorkflowDefinition["claude_session"];
}

export function useWorkflowGraph({
  activeFile,
  claudeSession,
}: UseWorkflowGraphOptions): WorkflowGraph {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const setNodesRef = useRef(setNodes);
  setNodesRef.current = setNodes;
  const setEdgesRef = useRef(setEdges);
  setEdgesRef.current = setEdges;

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) => addEdge({ ...connection, animated: true, style: EDGE_STYLE }, eds)),
    [setEdges],
  );

  const addNode = useCallback(() => {
    const id = newId();
    const lastNode = nodesRef.current[nodesRef.current.length - 1];
    const x = lastNode ? lastNode.position.x + 340 : 60;
    const y = lastNode ? lastNode.position.y : 120;

    const newNode: Node = {
      id,
      type: "step",
      position: { x, y },
      data: {
        title: "Claude Step",
        type: "claude",
        prompt: "",
        skipPermission: false,
      },
    };

    setNodes((nds) => [...nds, newNode]);

    if (lastNode) {
      setEdgesRef.current((eds) => [
        ...eds,
        {
          id: `e-${lastNode.id}-${id}`,
          source: lastNode.id,
          target: id,
          animated: true,
          style: EDGE_STYLE,
        },
      ]);
    }
  }, [setNodes]);

  const deleteNode = useCallback((id: string) => {
    setNodesRef.current((nds) => nds.filter((node) => node.id !== id));
    setEdgesRef.current((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  }, []);

  const updateNode = useCallback(
    (id: string, data: Partial<Pick<StepNodeData, "title" | "prompt" | "skipPermission">>) => {
      const updater = (nds: Node[]) =>
        nds.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...data } } : node));
      setNodesRef.current(updater);
      // Sync ref so getDefinition() returns fresh data immediately
      nodesRef.current = updater(nodesRef.current);
    },
    [],
  );

  const getDefinition = useCallback((): WorkflowDefinition => {
    const sorted = [...nodesRef.current].sort((a, b) => a.position.x - b.position.x);
    const workflow: WorkflowDefinition["workflow"] = sorted.map((node) => {
      const d = node.data as StepNodeData;
      return {
        name: d.title || "Claude Step",
        agent: "claude",
        prompt: d.prompt || "",
        skip_permission: d.skipPermission ?? false,
      };
    });

    const definition: WorkflowDefinition = {
      name: activeFile?.replace(/\.ya?ml$/, "") ?? "Canvas Workflow",
      workflow,
    };
    const sessionMode = resolveClaudeSessionMode(workflow, claudeSession);
    if (sessionMode) definition.claude_session = sessionMode;

    return definition;
  }, [activeFile, claudeSession]);

  const loadDefinition = useCallback(
    (definition: WorkflowDefinition | null) => {
      if (!definition?.workflow?.length) {
        setNodes([]);
        setEdges([]);
        return;
      }

      const newNodes: Node[] = definition.workflow.map((step, i) => ({
        id: newId(),
        type: "step",
        position: { x: 60 + i * 340, y: 120 },
        data: {
          title: step.name,
          type: "claude",
          prompt: step.prompt ?? "",
          skipPermission: step.skip_permission ?? false,
        },
      }));

      const newEdges: Edge[] = newNodes.slice(0, -1).map((node, i) => ({
        id: `e-${node.id}-${newNodes[i + 1]!.id}`,
        source: node.id,
        target: newNodes[i + 1]!.id,
        animated: true,
        style: EDGE_STYLE,
      }));

      setNodes(newNodes);
      setEdges(newEdges);
    },
    [setNodes, setEdges],
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    getDefinition,
    nodeCount: nodes.length,
    deleteNode,
    updateNode,
    loadDefinition,
  };
}
