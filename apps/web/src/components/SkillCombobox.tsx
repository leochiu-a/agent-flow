"use client";

import { useEffect, useState } from "react";
import type { SkillInfo } from "@agent-flow/core";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";

let cachedSkills: SkillInfo[] | null = null;

interface SkillComboboxProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
}

export function SkillCombobox({ value, onChange, disabled }: SkillComboboxProps) {
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

  return (
    <Combobox value={value ?? null} onValueChange={(val) => onChange(val ?? undefined)}>
      <ComboboxInput showClear showTrigger disabled={disabled} placeholder="Select a skill..." />
      <ComboboxContent>
        <ComboboxList>
          {skills.length === 0 && (
            <div className="flex w-full justify-center py-2 text-center text-sm text-muted-fg">
              No skills found
            </div>
          )}
          {skills.map((skill) => (
            <ComboboxItem key={skill.name} value={skill.name}>
              <div className="flex min-w-0 flex-col">
                <span className="text-sm">{skill.name}</span>
                {skill.description && (
                  <span className="text-xs text-muted-fg truncate">{skill.description}</span>
                )}
              </div>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
