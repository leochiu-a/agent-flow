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

const JOB_TITLE: Record<string, string> = {
  "get-jira-ticket": "Get Jira Ticket",
  "send-slack-message": "Send Slack Message",
  "tdd-implementation": "TDD Implementation",
  "claude-agent": "Claude Agent",
};

const DEFAULT_TITLE = "Claude Agent";

const titleForJob = (jobId?: string) => (jobId && JOB_TITLE[jobId]) || DEFAULT_TITLE;
const titleForType = (type: string) =>
  type === "jira"
    ? JOB_TITLE["get-jira-ticket"]!
    : type === "slack"
      ? JOB_TITLE["send-slack-message"]!
      : DEFAULT_TITLE;

const newId = () => `step-${crypto.randomUUID().slice(0, 8)}`;

export interface WorkflowGraph {
  // ReactFlow rendering
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange<Node>;
  onEdgesChange: OnEdgesChange<Edge>;
  onConnect: (connection: Connection) => void;

  // Toolbar actions
  addNode: (jobId?: string) => void;
  getDefinition: () => WorkflowDefinition;
  nodeCount: number;

  // Graph mutations
  deleteNode: (id: string) => void;
  updateNode: (
    id: string,
    data: Partial<
      Pick<
        StepNodeData,
        | "title"
        | "prompt"
        | "skipPermission"
        | "skill"
        | "jiraTicket"
        | "slackChannel"
        | "slackMessage"
      >
    >,
  ) => void;
  toggleNodeDisabled: (id: string) => void;

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

  const addNode = useCallback(
    (jobId?: string) => {
      const id = newId();
      const lastNode = nodesRef.current[nodesRef.current.length - 1];
      const x = lastNode ? lastNode.position.x + 340 : 60;
      const y = lastNode ? lastNode.position.y : 120;

      const isJira = jobId === "get-jira-ticket";
      const isSlack = jobId === "send-slack-message";
      const isTdd = jobId === "tdd-implementation";

      let nodeData: Record<string, unknown>;
      if (isJira) {
        nodeData = {
          title: titleForJob(jobId),
          type: "jira",
          job: "get-jira-ticket",
          prompt: "",
          jiraTicket: "",
          skipPermission: false,
        };
      } else if (isSlack) {
        nodeData = {
          title: titleForJob(jobId),
          type: "slack",
          job: "send-slack-message",
          prompt: "",
          slackChannel: "",
          slackMessage: "",
          skipPermission: false,
        };
      } else if (isTdd) {
        nodeData = {
          title: titleForJob(jobId),
          type: "claude",
          job: "tdd-implementation",
          prompt:
            "Use strict TDD (Red-Green-Refactor) to implement the feature described in the previous step's output.\n\nContext from previous step:\n{{previous_step_output}}",
          skill: "test-driven-development",
          skipPermission: false,
        };
      } else {
        nodeData = { title: titleForJob(jobId), type: "claude", prompt: "", skipPermission: false };
      }

      const newNode: Node = {
        id,
        type: "step",
        position: { x, y },
        data: nodeData,
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
    },
    [setNodes],
  );

  const deleteNode = useCallback((id: string) => {
    setNodesRef.current((nds) => nds.filter((node) => node.id !== id));
    setEdgesRef.current((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  }, []);

  const updateNode = useCallback(
    (
      id: string,
      data: Partial<
        Pick<
          StepNodeData,
          | "title"
          | "prompt"
          | "skipPermission"
          | "skill"
          | "jiraTicket"
          | "slackChannel"
          | "slackMessage"
        >
      >,
    ) => {
      const updater = (nds: Node[]) =>
        nds.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...data } } : node));
      setNodesRef.current(updater);
      // Sync ref so getDefinition() returns fresh data immediately
      nodesRef.current = updater(nodesRef.current);
    },
    [],
  );

  const toggleNodeDisabled = useCallback((id: string) => {
    const updater = (nds: Node[]) =>
      nds.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, disabled: !(node.data as StepNodeData).disabled } }
          : node,
      );
    setNodesRef.current(updater);
    nodesRef.current = updater(nodesRef.current);
  }, []);

  const getDefinition = useCallback((): WorkflowDefinition => {
    const sorted = [...nodesRef.current]
      .filter((node) => !(node.data as StepNodeData).disabled)
      .sort((a, b) => a.position.x - b.position.x);
    const workflow: WorkflowDefinition["workflow"] = sorted.map((node) => {
      const d = node.data as StepNodeData;

      let prompt = d.prompt || "";
      let metadata: Record<string, unknown> | undefined;

      if (d.type === "jira" && d.jiraTicket) {
        const parts = [
          `Use the Jira MCP tools to fetch and analyze ticket "${d.jiraTicket}".`,
          `Read the ticket details including summary, description, status, assignee, and comments.`,
        ];
        if (d.prompt?.trim()) {
          parts.push(`\n${d.prompt}`);
        }
        prompt = parts.join("\n");
        metadata = { job: d.job, jira_ticket: d.jiraTicket };
      } else if (d.type === "slack" && d.slackChannel) {
        const parts = [
          `Use the Slack MCP tools to send a message to channel "${d.slackChannel}".`,
          `Message: "${d.slackMessage}"`,
        ];
        prompt = parts.join("\n");
        metadata = { job: d.job, slack_channel: d.slackChannel, slack_message: d.slackMessage };
      }

      return {
        name: d.title || titleForType(d.type ?? "claude"),
        agent: "claude" as const,
        prompt,
        skip_permission: d.skipPermission ?? false,
        ...(d.skill ? { skill: d.skill } : {}),
        ...(metadata ? { metadata } : {}),
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

      const newNodes: Node[] = definition.workflow.map((step, i) => {
        const job = step.metadata?.job as string | undefined;
        const isJira = job === "get-jira-ticket";
        const isSlack = job === "send-slack-message";

        return {
          id: newId(),
          type: "step",
          position: { x: 60 + i * 340, y: 120 },
          data: {
            title: step.name,
            type: isJira ? "jira" : isSlack ? "slack" : "claude",
            prompt: step.prompt ?? "",
            skipPermission: step.skip_permission ?? false,
            ...(step.skill ? { skill: step.skill } : {}),
            ...(isJira ? { job, jiraTicket: step.metadata?.jira_ticket as string } : {}),
            ...(isSlack
              ? {
                  job,
                  slackChannel: step.metadata?.slack_channel as string,
                  slackMessage: step.metadata?.slack_message as string,
                }
              : {}),
          },
        };
      });

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
    toggleNodeDisabled,
    loadDefinition,
  };
}
