"use client";

import { useMemo, useState, type FC, type SVGProps } from "react";

import { Plus, Search } from "lucide-react";
import SlackIcon from "@/assets/slack.svg";
import ClaudeIcon from "@/assets/claude.svg";
import AtlassianIcon from "@/assets/atlassian.svg";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { IconButton } from "@/components/ui/icon-button";

interface NodeItem {
  id: string;
  label: string;
  description: string;
  icon: FC<SVGProps<SVGSVGElement>>;
}

const NODE_LIST: NodeItem[] = [
  { id: "claude-agent", label: "Claude Agent", description: "Blank node", icon: ClaudeIcon },
  {
    id: "get-jira-ticket",
    label: "Get Jira Ticket",
    description: "Fetch and assign Jira issues",
    icon: AtlassianIcon,
  },
  {
    id: "tdd-implementation",
    label: "TDD Implementation",
    description: "Test-driven development workflow",
    icon: ClaudeIcon,
  },
  {
    id: "send-slack-message",
    label: "Send Slack Message",
    description: "Post messages to Slack channels",
    icon: SlackIcon,
  },
];

interface AddNodeDrawerProps {
  onAddNode: (jobId: string) => void;
  disabled?: boolean;
}

export function AddNodeDrawer({ onAddNode, disabled }: AddNodeDrawerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredList = useMemo(() => {
    if (!search.trim()) return NODE_LIST;
    const q = search.toLowerCase();
    return NODE_LIST.filter(
      (item) => item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q),
    );
  }, [search]);

  const handleSelectNode = (item: NodeItem) => {
    onAddNode(item.id);
    setOpen(false);
    setSearch("");
  };

  return (
    <>
      <IconButton
        icon={<Plus size={14} />}
        variant="border"
        size="sm"
        tooltip="Add node"
        tooltipSide="left"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title="Add node"
      />

      <Drawer direction="right" open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add Node</DrawerTitle>
            <DrawerDescription>Select a node type to add to your workflow</DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-3">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg"
              />
              <input
                type="text"
                placeholder="Search nodes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-border bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-pink"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
            {filteredList.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNode(item)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left transition hover:border-pink/40 hover:bg-pink-subtle"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-pink/10 text-pink">
                  <item.icon className="size-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-dark">{item.label}</div>
                  <div className="text-[11px] text-muted-fg">{item.description}</div>
                </div>
              </button>
            ))}
            {filteredList.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-fg">
                No nodes match your search
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
