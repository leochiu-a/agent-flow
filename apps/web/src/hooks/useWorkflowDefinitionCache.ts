"use client";

import { useCallback, useState } from "react";
import { load as yamlLoad } from "js-yaml";
import type { WorkflowDefinition } from "@agent-flow/core";

const CACHE = new Map<string, WorkflowDefinition>();

export function useWorkflowDefinitionCache(initialFile?: string) {
  const [workflowDefinition, setWorkflowDefinition] = useState<WorkflowDefinition | null>(() => {
    if (!initialFile) return null;
    return CACHE.get(initialFile) ?? null;
  });

  const loadFromFile = useCallback(async (filename: string) => {
    const cached = CACHE.get(filename);
    if (cached) {
      setWorkflowDefinition(cached);
      return;
    }

    try {
      const res = await fetch(`/api/workflow/read?file=${encodeURIComponent(filename)}`);
      const data: { content?: string } = await res.json();
      const parsed = yamlLoad(data.content ?? "") as WorkflowDefinition;
      CACHE.set(filename, parsed);
      setWorkflowDefinition(parsed);
    } catch {
      setWorkflowDefinition(null);
    }
  }, []);

  const setFromContent = useCallback((filename: string, content: string) => {
    try {
      const parsed = yamlLoad(content) as WorkflowDefinition;
      CACHE.set(filename, parsed);
      setWorkflowDefinition(parsed);
    } catch {
      // ignore malformed yaml
    }
  }, []);

  const clearDefinition = useCallback(() => {
    setWorkflowDefinition(null);
  }, []);

  return {
    workflowDefinition,
    setWorkflowDefinition,
    loadFromFile,
    setFromContent,
    clearDefinition,
  };
}
