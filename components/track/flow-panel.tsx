"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowDown, GitBranch, Maximize2, Minimize2, Pause, Play, Route } from "lucide-react"
import type { ApplicationFilters, FocusLens } from "@/lib/applications"
import type { Diagnostics, FlowMode } from "@/lib/track-data"
import { PipelineFlow } from "./pipeline-flow"
import { FlowDiagnostics } from "./flow-diagnostics"
import { cn } from "@/lib/utils"

interface FlowPanelProps {
  mode: FlowMode
  onModeChange: (mode: FlowMode) => void
  playing: boolean
  onTogglePlay: () => void
  bottleneckId: string
  onSelectStage: (stageId: string) => void
  expanded: boolean
  onToggleExpand: () => void
  diagnostics: Diagnostics | null
  onDiagnostics: (diagnostics: Diagnostics) => void
  focusId: string | null
  onFocus: (id: string | null) => void
  filters: ApplicationFilters
  focusLens: FocusLens
  filterScale: number
}

export function FlowPanel({
  mode,
  onModeChange,
  playing,
  onTogglePlay,
  bottleneckId,
  onSelectStage,
  expanded,
  onToggleExpand,
  diagnostics,
  onDiagnostics,
  focusId,
  onFocus,
  filters,
  focusLens,
  filterScale,
}: FlowPanelProps) {
  const fullJourney = mode === "complex"
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const [canScroll, setCanScroll] = useState(false)

  useEffect(() => {
    const workspace = workspaceRef.current
    if (!workspace) return
    const update = () => setCanScroll(workspace.scrollHeight > workspace.clientHeight + 4)
    const frame = requestAnimationFrame(update)
    const observer = new ResizeObserver(update)
    observer.observe(workspace)
    if (workspace.firstElementChild) observer.observe(workspace.firstElementChild)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [mode, filterScale, expanded])

  return (
    <section aria-label="Connections system flow" className="flex min-w-0 max-w-full flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[0.68rem] font-bold uppercase text-accent">
            <span
              className={cn("h-2 w-2 rounded-full", playing ? "animate-pulse bg-success" : "bg-muted-foreground")}
              aria-hidden="true"
            />
            {playing ? "Replaying current demo events" : "Demo event replay paused"}
          </div>
          <h2 className="text-lg font-semibold text-foreground">Marble Run Command Centre</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {fullJourney
              ? "Stage totals and active loop counts update as synthetic case events move through returns, rework and fallout routes."
              : "Stage totals update as synthetic current case events move along the primary path. This is not a forecast."}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Journey view:</span>
          <div className="flex h-9 items-center rounded-md border border-border bg-secondary p-1" aria-label="Journey view">
            <button
              type="button"
              onClick={() => onModeChange("simple")}
              aria-pressed={!fullJourney}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-semibold transition-colors",
                !fullJourney ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Route className="h-3.5 w-3.5" aria-hidden="true" />
              Primary path
            </button>
            <button
              type="button"
              onClick={() => onModeChange("complex")}
              aria-pressed={fullJourney}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-semibold transition-colors",
                fullJourney ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
              Full journey
            </button>
          </div>

          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={playing ? "Pause current flow animation" : "Resume current flow animation"}
            title={playing ? "Pause current flow animation" : "Resume current flow animation"}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-primary transition-colors hover:bg-secondary"
          >
            {playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
          </button>

          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={expanded ? "Fit flow to page" : "Expand flow"}
            title={expanded ? "Fit flow to page" : "Expand flow"}
            className="hidden h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-primary transition-colors hover:bg-secondary xl:flex"
          >
            {expanded ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="relative border-y border-border py-2">
        <div
          ref={workspaceRef}
          className={cn(
            "marble-workspace max-h-[480px] overflow-auto pr-1",
            fullJourney && "max-h-[540px]",
            expanded && "xl:max-h-[650px]",
          )}
        >
          <div className="w-fit min-w-full">
            <div className={cn("mx-auto w-fit", expanded && "xl:mx-0")}>
              <PipelineFlow
                mode={mode}
                playing={playing}
                bottleneckId={bottleneckId}
                onSelectStage={onSelectStage}
                focusId={focusId}
                onDiagnostics={onDiagnostics}
                filters={filters}
                focusLens={focusLens}
                filterScale={filterScale}
              />
            </div>
          </div>
        </div>
        {canScroll && fullJourney && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-md border border-border bg-card/95 px-2.5 py-1 text-[0.68rem] font-semibold text-muted-foreground shadow-sm">
            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            Scroll to explore full journey
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-bold uppercase text-accent">Marble Run Insight</p>
            <h3 className="text-sm font-semibold text-foreground">Where is current flow breaking down?</h3>
          </div>
          <p className="hidden text-xs text-muted-foreground md:block">Select a diagnostic to investigate its stage</p>
        </div>
        <FlowDiagnostics
          diagnostics={diagnostics}
          focusId={focusId}
          onFocus={onFocus}
          onInvestigate={onSelectStage}
          mode={mode}
        />
      </div>
    </section>
  )
}
