"use client";

import { useEffect, useState } from "react";
import type { SkillInfo } from "@agent-flow/core";

let cachedSkills: SkillInfo[] | null = null;

/** @internal Reset shared skill cache – test only */
export function _resetSkillCache() {
  cachedSkills = null;
}

export function useSkillList(): SkillInfo[] {
  const [skills, setSkills] = useState<SkillInfo[]>(cachedSkills ?? []);

  useEffect(() => {
    if (cachedSkills) return;
    const controller = new AbortController();
    fetch("/api/skills/list", { signal: controller.signal })
      .then((res) => res.json())
      .then((data: { skills: SkillInfo[] }) => {
        cachedSkills = data.skills;
        setSkills(data.skills);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return skills;
}
