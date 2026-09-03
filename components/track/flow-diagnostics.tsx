"use client"

import { AlertTriangle, Clock, LogOut, RotateCcw, TrendingUp } from "lucide-react"
import type { Diagnostics, FlowMode } from "@/lib/track-data"
import { cn } from "@/lib/utils"

interface FlowDiagnosticsProps {
  diagnostics: Diagnostics | null
  focusId: string | null
  onFocus: (stageId: string | null) => void
  onInvestigate: (stageId: string) => void
  mode: FlowMode
}

export function FlowDiagnostics({ diagnostics, focusId, onFocus, onInvestigate, mode }: FlowDiagnosticsProps) {
  const d = diagnostics
  const items = [
    {
      id: d?.bottleneck.stageId ?? null,
      icon: AlertTriangle,
      tone: "danger" as const,
      label: "Bottleneck now",
      value: d ? `${d.bottleneck.queue} in queue` : "—",
      caption: d?.bottleneck.label ?? "Locating current bottleneck…",
    },
    {
      id: d?.growing?.stageId ?? d?.bottleneck.stageId ?? null,
      icon: TrendingUp,
      tone: "warning" as const,
      label: "Queue building now",
      value: d?.growing ? `+${d.growing.delta.toFixed(1)}/s` : "Stable",
      caption: d?.growing?.label ?? "No queue currently growing",
    },
    {
      id: mode === "complex" ? "gated-outcome" : d?.rework.stageId ?? null,
      icon: mode === "complex" ? LogOut : RotateCcw,
      tone: "slate" as const,
      label: mode === "complex" ? "Falling out now" : "Returns / rework",
      value: mode === "complex" ? (d ? `${d.fallout.lost} current` : "—") : d ? `${d.rework.count} current` : "—",
      caption:
        mode === "complex"
          ? d
            ? `${(d.fallout.rate * 100).toFixed(0)}% of observed cases exit the system`
            : "Reading current fallout…"
          : d?.rework.label ?? "Locating current rework…",
    },
    {
      id: d?.delay.stageId ?? null,
      icon: Clock,
      tone: "violet" as const,
      label: "Biggest current delay",
      value: d ? `~${d.delay.days} days` : "—",
      caption: d?.delay.label ?? "Calculating current dwell…",
    },
  ]

  const toneClass: Record<string, { tile: string; icon: string; value: string }> = {
    danger: { tile: "bg-danger-muted", icon: "text-danger", value: "text-danger" },
    warning: { tile: "bg-queue-muted", icon: "text-queue", value: "text-queue" },
    slate: { tile: "bg-secondary", icon: "text-muted-foreground", value: "text-foreground" },
    violet: { tile: "bg-violet-muted", icon: "text-violet", value: "text-violet" },
  }

  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-card/60 p-2 lg:grid-cols-4" aria-label="Current flow diagnostics">
      {items.map((item) => {
        const tone = toneClass[item.tone]
        const active = item.id != null && item.id === focusId
        const clickable = item.id != null
        return (
          <button
            key={item.label}
            type="button"
            disabled={!clickable}
            onClick={() => {
              if (!item.id) return
              onFocus(active ? null : item.id)
              onInvestigate(item.id)
            }}
            aria-pressed={active}
            className={cn(
              "flex min-h-[92px] items-start gap-3 rounded-md border p-2.5 text-left transition-all",
              active ? "border-accent ring-1 ring-accent/40" : "border-transparent",
              clickable ? "cursor-pointer hover:bg-secondary/60" : "cursor-default opacity-90",
            )}
          >
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", tone.tile)}>
              <item.icon className={cn("h-4.5 w-4.5", tone.icon)} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.65rem] font-medium uppercase text-muted-foreground">{item.label}</span>
              <span className={cn("block text-sm font-bold leading-tight tabular-nums", tone.value)}>{item.value}</span>
              <span className="block truncate text-[0.7rem] text-muted-foreground">{item.caption}</span>
              {clickable && <span className="mt-1 block text-[0.68rem] font-semibold text-primary">Investigate stage</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
