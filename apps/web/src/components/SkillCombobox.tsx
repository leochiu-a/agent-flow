"use client";

import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";
import { useSkillList } from "@/hooks/useSkillList";

interface SkillComboboxProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
}

export function SkillCombobox({ value, onChange, disabled }: SkillComboboxProps) {
  const skills = useSkillList();

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
