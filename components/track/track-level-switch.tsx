"use client"

import { Building2, Network } from "lucide-react"
import { cn } from "@/lib/utils"

export type TrackLevel = "system" | "application"

interface TrackLevelSwitchProps {
  value: TrackLevel
  onChange: (value: TrackLevel) => void
}

const LEVELS = [
  { value: "system" as const, label: "System control", detail: "Marble run", icon: Network },
  { value: "application" as const, label: "Application control", detail: "Individual cases", icon: Building2 },
]

export function TrackLevelSwitch({ value, onChange }: TrackLevelSwitchProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
      <span className="text-xs font-bold uppercase text-muted-foreground">Track view</span>
      <div className="flex h-11 items-center rounded-md border border-border bg-secondary p-1" role="tablist" aria-label="Track level">
        {LEVELS.map((level) => {
          const active = value === level.value
          return (
            <button
              key={level.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(level.value)}
              className={cn(
                "flex h-9 min-w-0 items-center gap-2 rounded px-3 text-left transition-colors sm:min-w-[180px]",
                active ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <level.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold">{level.label}</span>
                <span className="hidden truncate text-[0.65rem] sm:block">{level.detail}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
