"use client";

import * as React from "react";
import { useOnClickOutside } from "usehooks-ts";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface Tab {
  title: string;
  icon: LucideIcon;
  type?: never;
}

interface Separator {
  type: "separator";
  title?: never;
  icon?: never;
}

type TabItem = Tab | Separator;

interface ExpandableTabsProps {
  tabs: TabItem[];
  className?: string;
  activeColor?: string;
  onChange?: (index: number | null) => void;
}

export function ExpandableTabs({
  tabs,
  className,
  activeColor = "text-white",
  onChange,
}: ExpandableTabsProps) {
  const [selected, setSelected] = React.useState<number | null>(null);
  const outsideClickRef = React.useRef<HTMLDivElement>(null!);

  useOnClickOutside(outsideClickRef, () => {
    setSelected(null);
    onChange?.(null);
  });

  const handleSelect = (index: number) => {
    setSelected(index);
    onChange?.(index);
  };

  return (
    <div
      ref={outsideClickRef}
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-background p-1 shadow-sm",
        className
      )}
    >
      {tabs.map((tab, index) => {
        if (tab.type === "separator") {
          return (
            <div
              key={`separator-${index}`}
              className="mx-1 h-[24px] w-[1.2px] bg-border"
              aria-hidden="true"
            />
          );
        }

        const Icon = tab.icon;
        const isSelected = selected === index;

        return (
          <button
            key={tab.title}
            onClick={() => handleSelect(index)}
            className={cn(
              "relative flex items-center gap-0 rounded-xl px-2 py-2 text-sm font-medium transition-all duration-300 ease-out",
              isSelected
                ? cn("bg-white/10 gap-2 px-4", activeColor)
                : "text-white/40 hover:bg-white/5 hover:text-white/70"
            )}
          >
            <Icon size={20} />
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap transition-all duration-300 ease-out",
                isSelected ? "max-w-[120px] opacity-100" : "max-w-0 opacity-0"
              )}
            >
              {tab.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}
