"use client"

import { Ban, CircleDot, ClipboardCheck, Clock3, LogOut, RotateCcw } from "lucide-react"
import type { FocusLens as FocusLensValue } from "@/lib/applications"
import { cn } from "@/lib/utils"

interface FocusLensProps {
  value: FocusLensValue
  onChange: (value: FocusLensValue) => void
}

const lenses = [
  { value: "all", label: "All", icon: CircleDot },
  { value: "blocked", label: "Blocked", icon: Ban },
  { value: "long-dwell", label: "Long dwell", icon: Clock3 },
  { value: "returned-rework", label: "Returned / rework", icon: RotateCcw },
  { value: "actionable", label: "Actionable now", icon: ClipboardCheck },
  { value: "fallout", label: "Fallout", icon: LogOut },
] as const

export function FocusLens({ value, onChange }: FocusLensProps) {
  return (
    <section className="flex flex-col gap-2 md:flex-row md:items-center" aria-label="Current-state focus lens">
      <div className="shrink-0">
        <p className="text-[0.68rem] font-bold uppercase text-accent">Current-state focus</p>
        <h2 className="text-sm font-semibold text-foreground">Focus</h2>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1 rounded-md border border-border bg-secondary p-1">
        {lenses.map((lens) => {
          const active = value === lens.value
          return (
            <button
              key={lens.value}
              type="button"
              onClick={() => onChange(lens.value)}
              aria-pressed={active}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-semibold transition-colors",
                active ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <lens.icon className="h-3.5 w-3.5" aria-hidden="true" />
              {lens.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}
