"use client"

import { Info } from "lucide-react"
import { KPIS, type Timeframe } from "@/lib/track-data"
import type { FocusLens } from "@/lib/applications"
import { KPI_TONE } from "@/lib/track-ui"
import { useCountUp } from "@/hooks/use-count-up"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function KpiCards({
  timeframe,
  scale = 1,
  focus = "all",
  falloutScale = scale,
}: {
  timeframe: Timeframe
  scale?: number
  focus?: FocusLens
  falloutScale?: number
}) {
  return (
    <TooltipProvider delay={150}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} timeframe={timeframe} scale={scale} focus={focus} falloutScale={falloutScale} />
        ))}
      </div>
    </TooltipProvider>
  )
}

function KpiCard({
  kpi,
  timeframe,
  scale,
  focus,
  falloutScale,
}: {
  kpi: (typeof KPIS)[number]
  timeframe: Timeframe
  scale: number
  focus: FocusLens
  falloutScale: number
}) {
  const tone = KPI_TONE[kpi.tone]
  const targetValue =
    focus === "fallout"
      ? kpi.id === "fallout"
        ? Math.round(kpi.values[timeframe] * falloutScale)
        : 0
      : Math.round(kpi.values[timeframe] * scale)
  const value = useCountUp(targetValue)
  const Icon = kpi.icon

  return (
    <article className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-lg", tone.tile)}>
        <Icon className={cn("h-6 w-6", tone.icon)} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
          <Tooltip>
            <TooltipTrigger aria-label={`About ${kpi.label}`} className="text-muted-foreground/50 hover:text-muted-foreground">
              <Info className="h-4 w-4" aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent className="max-w-56 text-pretty">{kpi.info}</TooltipContent>
          </Tooltip>
        </div>
        <p className={cn("text-3xl font-bold tabular-nums", tone.value)}>{value}</p>
      </div>
    </article>
  )
}
