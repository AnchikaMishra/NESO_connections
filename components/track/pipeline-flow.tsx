"use client"

import { useEffect, useRef, useState } from "react"
import { Check } from "lucide-react"
import {
  STAGE_ROWS,
  STAGES,
  interpPressure,
  stagePressure,
  type Diagnostics,
  type FlowMode,
  type Stage,
} from "@/lib/track-data"
import { pressureColor } from "@/lib/track-ui"
import {
  CONNECTION_TYPE_COLORS,
  CONNECTION_TYPES,
  applicationsAtStage,
  type ApplicationFilters,
  type FocusLens,
} from "@/lib/applications"
import { cn } from "@/lib/utils"
import { FlowSimulation } from "./flow-simulation"

interface PipelineFlowProps {
  mode: FlowMode
  playing: boolean
  bottleneckId: string
  /** Drill into the applications sitting at a stage. */
  onSelectStage: (stageId: string) => void
  /** Stage id emphasised by a diagnostics click, or null. */
  focusId: string | null
  onDiagnostics: (d: Diagnostics) => void
  filters: ApplicationFilters
  focusLens: FocusLens
  filterScale: number
  /** Optional forecast position. Track omits this and remains fixed at now. */
  month?: number
  /** Optional forecast card totals keyed by stage id. */
  stageCounts?: Record<string, number>
  /** Optional forecast pressure and affected-case counts keyed by stage id. */
  stagePressures?: Record<string, number>
  stageAppCounts?: Record<string, number>
  /** Show current-to-forecast comparison without changing the Track cards. */
  forecastView?: boolean
  bottleneckLabel?: string
  /** Optional comparison presentation. Defaults preserve Predict. */
  comparisonBaselineLabel?: string
  comparisonOutcomeLabel?: string
  comparisonLegendLabel?: string
  comparisonTone?: "predict" | "simulate"
  baselineStageCounts?: Record<string, number>
}

// Vertical room reserved so piles (below cards) and loop arcs (above rows)
// drawn on the canvas overlay never collide with the card rows.
const TOP_RESERVE = 104 // row 0 loop arc headroom
const GAP_0_1 = 150 // row 0 piles + row 1 loop arcs
const GAP_1_2 = 120 // row 1 (bottleneck) piles

export function PipelineFlow({
  mode,
  playing,
  bottleneckId,
  onSelectStage,
  focusId,
  onDiagnostics,
  filters,
  focusLens,
  filterScale,
  month = 0,
  stageCounts,
  stagePressures,
  stageAppCounts,
  forecastView = false,
  bottleneckLabel = "Bottleneck",
  comparisonBaselineLabel = "Current",
  comparisonOutcomeLabel = "Predicted",
  comparisonLegendLabel = "Predicted / illustrative",
  comparisonTone = "predict",
  baselineStageCounts,
}: PipelineFlowProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const stageRefs = useRef<(HTMLElement | null)[]>([])
  const [measureTick, setMeasureTick] = useState(0)
  const [liveCounts, setLiveCounts] = useState<number[] | null>(null)

  const bottleneckIndex = STAGES.findIndex((s) => s.id === bottleneckId)
  const focusIndex = focusId ? STAGES.findIndex((s) => s.id === focusId) : -1
  const rowGaps = mode === "complex" ? [TOP_RESERVE, GAP_0_1, GAP_1_2] : [24, 68, 68]

  // Re-measure whenever the container resizes (expand/fit, viewport changes).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const bump = () => setMeasureTick((t) => t + 1)
    bump()
    const ro = new ResizeObserver(bump)
    ro.observe(el)
    window.addEventListener("resize", bump)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", bump)
    }
  }, [])

  useEffect(() => setLiveCounts(null), [filterScale, mode, filters.connectionType, month, forecastView])

  const updateLiveCounts = (nextCounts: number[]) => {
    setLiveCounts((current) =>
      current?.length === nextCounts.length && current.every((count, index) => count === nextCounts[index])
        ? current
        : nextCounts,
    )
  }

  let globalIndex = 0

  return (
    <div ref={containerRef} className="relative w-fit">
      {STAGE_ROWS.map((row, rowIndex) => {
        const startIndex = globalIndex
        globalIndex += row.length
        return (
          <div key={rowIndex}>
            {/* reserved headroom / inter-row gap for canvas-drawn flow */}
            <div style={{ height: rowGaps[rowIndex] }} aria-hidden="true" />
            <div className="flex items-stretch gap-x-6">
              {row.map((stage, i) => {
                const gi = startIndex + i
                const pressure = forecastView
                  ? (stagePressures?.[stage.id] ?? interpPressure(stage, month))
                  : stagePressure(stage, "today")
                const appCount =
                  stageAppCounts?.[stage.id] ?? applicationsAtStage(stage.id, filters, focusLens).length
                const forecastCount = stageCounts?.[stage.id]
                return (
                  <StageCard
                    key={stage.id}
                    ref={(el) => {
                      stageRefs.current[gi] = el
                    }}
                    stage={stage}
                    isBottleneck={stage.id === bottleneckId}
                    isFocused={gi === focusIndex}
                    onClick={() => onSelectStage(stage.id)}
                    appCount={appCount}
                    pressure={pressure}
                    count={
                      forecastView
                        ? (forecastCount ?? Math.round(stage.counts.today * filterScale))
                        : (liveCounts?.[gi] ?? Math.round(stage.counts.today * filterScale))
                    }
                    comparisonCount={
                      forecastView
                        ? (baselineStageCounts?.[stage.id] ?? Math.round(stage.counts.today * filterScale))
                        : undefined
                    }
                    bottleneckLabel={bottleneckLabel}
                    forecastView={forecastView}
                    comparisonBaselineLabel={comparisonBaselineLabel}
                    comparisonOutcomeLabel={comparisonOutcomeLabel}
                    comparisonTone={comparisonTone}
                  />
                )
              })}
            </div>
          </div>
        )
      })}

      <Legend
        mode={mode}
        forecastView={forecastView}
        comparisonLegendLabel={comparisonLegendLabel}
        comparisonTone={comparisonTone}
      />

      <FlowSimulation
        containerRef={containerRef}
        stageRefs={stageRefs}
        month={month}
        scenario={false}
        playing={playing}
        mode={mode}
        filterScale={filterScale}
        connectionTypeFilter={filters.connectionType}
        bottleneckIndex={bottleneckIndex}
        focusIndex={focusIndex}
        measureTick={measureTick}
        onCounts={updateLiveCounts}
        onDiagnostics={onDiagnostics}
      />
    </div>
  )
}

interface StageCardProps {
  stage: Stage
  isBottleneck: boolean
  isFocused?: boolean
  onClick?: () => void
  /** Number of sampled applications sitting at this stage (drill-in). */
  appCount?: number
  pressure: number
  count: number
  comparisonCount?: number
  bottleneckLabel?: string
  forecastView?: boolean
  comparisonBaselineLabel?: string
  comparisonOutcomeLabel?: string
  comparisonTone?: "predict" | "simulate"
}

function StageCard({
  ref,
  stage,
  isBottleneck,
  isFocused,
  onClick,
  appCount = 0,
  pressure,
  count,
  comparisonCount,
  bottleneckLabel = "Bottleneck",
  forecastView = false,
  comparisonBaselineLabel = "Current",
  comparisonOutcomeLabel = "Predicted",
  comparisonTone = "predict",
}: StageCardProps & { ref?: (el: HTMLElement | null) => void }) {
  const energised = stage.kind === "energised"
  const congested = pressure >= 0.6 && !energised

  const inner = (
    <div
      className={cn(
        "relative z-0 flex flex-col justify-between rounded-xl border bg-card p-3 text-left shadow-sm transition-all",
        forecastView ? "h-[116px] w-[140px]" : "h-[96px] w-[128px]",
        isBottleneck && "border-danger bg-danger-muted ring-2 ring-danger/30",
        energised && "border-success bg-success-muted/40",
        !isBottleneck && !energised && "border-border",
        isFocused && "ring-2 ring-accent",
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
      )}
      style={
        congested
          ? { borderColor: pressureColor(pressure), ["--pulse-color" as string]: pressureColor(pressure) + "66" }
          : undefined
      }
    >
      {congested && <span className="absolute inset-0 -z-10 rounded-xl animate-congest-pulse" aria-hidden="true" />}
      {energised && (
        <span className="absolute -right-2 -top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-success text-success-foreground shadow-sm">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      )}
      <p className="text-pretty text-xs font-medium leading-snug text-foreground">{stage.label}</p>
      {forecastView && comparisonCount !== undefined ? (
        <div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-1">
            <span
              className={cn(
                "min-w-0",
                comparisonTone === "simulate" && "rounded border border-dashed border-muted-foreground/45 bg-secondary/45 px-1.5 py-1",
              )}
            >
              <span className="block text-[0.5rem] font-bold uppercase text-muted-foreground">{comparisonBaselineLabel}</span>
              <span className="block text-base font-bold leading-none tabular-nums text-primary">{comparisonCount}</span>
            </span>
            <span className="pb-1 text-xs text-muted-foreground" aria-hidden="true">&rarr;</span>
            <span
              className={cn(
                "min-w-0 rounded border px-1.5 py-1",
                comparisonTone === "predict" && "border-dashed",
                isBottleneck
                  ? "border-danger/60 bg-danger-muted/60"
                  : comparisonTone === "simulate"
                    ? "border-simulate/55 bg-simulate-muted/45"
                    : "border-anticipate/55 bg-anticipate-muted/45",
              )}
            >
              <span className={cn("block text-[0.48rem] font-bold uppercase", isBottleneck ? "text-danger" : comparisonTone === "simulate" ? "text-simulate" : "text-anticipate")}>
                {comparisonOutcomeLabel}
              </span>
              <span className={cn("block text-lg font-bold leading-none tabular-nums", isBottleneck ? "text-danger" : energised ? "text-success" : comparisonTone === "simulate" ? "text-simulate" : "text-anticipate")}>{count}</span>
            </span>
          </div>
          <div className="mt-1 flex justify-end">
            {isBottleneck ? (
              <span className="rounded bg-danger px-1.5 py-0.5 text-[0.55rem] font-bold uppercase leading-none text-danger-foreground">{bottleneckLabel}</span>
            ) : onClick ? (
              <span className="rounded bg-secondary px-1.5 py-0.5 text-[0.55rem] font-medium leading-none text-muted-foreground">
                {appCount > 0 ? `${appCount} ${appCount === 1 ? "sample" : "samples"}` : "View stage"}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex items-end justify-between gap-1">
          <span className={cn("text-2xl font-bold tabular-nums", isBottleneck ? "text-danger" : energised ? "text-success" : "text-primary")}>{count}</span>
          {isBottleneck ? (
            <span className="rounded bg-danger px-1.5 py-0.5 text-[0.6rem] font-bold uppercase leading-none tracking-wide text-danger-foreground">{bottleneckLabel}</span>
          ) : onClick ? (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[0.6rem] font-medium leading-none text-muted-foreground">
              {appCount > 0 ? `${appCount} ${appCount === 1 ? "sample" : "samples"}` : "View stage"}
            </span>
          ) : null}
        </div>
      )}
    </div>
  )

  if (onClick) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        aria-label={`${stage.label} — ${appCount} detailed application sample${appCount === 1 ? "" : "s"}, view stage`}
      >
        {inner}
      </button>
    )
  }
  return (
    <div ref={ref} className="flex items-stretch">
      {inner}
    </div>
  )
}

function Legend({
  mode,
  forecastView,
  comparisonLegendLabel,
  comparisonTone,
}: {
  mode: FlowMode
  forecastView: boolean
  comparisonLegendLabel: string
  comparisonTone: "predict" | "simulate"
}) {
  return (
    <div className="mt-4 flex max-w-[900px] flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-2">
        Dot colour:
      </span>
      {CONNECTION_TYPES.map((connectionType) => (
        <span key={connectionType} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: CONNECTION_TYPE_COLORS[connectionType] }}
            aria-hidden="true"
          />
          {connectionType}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full border-2 border-danger" aria-hidden="true" />
        Congested
      </span>
      {forecastView && (
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "h-4 w-5 rounded border",
              comparisonTone === "simulate"
                ? "border-simulate bg-simulate-muted/45"
                : "border-dashed border-anticipate bg-anticipate-muted/45",
            )}
            aria-hidden="true"
          />
          {comparisonLegendLabel}
        </span>
      )}
      {mode === "complex" && (
        <>
          <span className="flex items-center gap-2">
            <span className="inline-block h-0 w-6 border-t-2 border-dashed border-anticipate" aria-hidden="true" />
            Return, resubmission or rework loop
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-0 w-6 border-t-2 border-dashed border-muted-foreground" aria-hidden="true" />
            Fallout from withdrawal or rejection
          </span>
        </>
      )}
    </div>
  )
}
