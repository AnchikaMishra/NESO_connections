"use client"

import { useMemo, useState } from "react"
import { Info } from "lucide-react"
import { TrackHeader } from "@/components/track/track-header"
import { TrackFilters } from "@/components/track/track-filters"
import { FocusLens } from "@/components/track/focus-lens"
import { KpiCards } from "@/components/track/kpi-cards"
import { FlowPanel } from "@/components/track/flow-panel"
import { InsightRail } from "@/components/track/insight-rail"
import { StageApplicationsDialog } from "@/components/track/stage-applications-dialog"
import { ApplicationDialog } from "@/components/track/application-dialog"
import { ApplicationControl } from "@/components/track/application-control"
import { TrackLevelSwitch, type TrackLevel } from "@/components/track/track-level-switch"
import { PredictDashboard } from "@/components/predict/predict-dashboard"
import { SimulateDashboard } from "@/components/simulate/simulate-dashboard"
import {
  DEFAULT_APPLICATION_FILTERS,
  APPLICATIONS,
  filterApplications,
  filteredPortfolioScale,
  isFallout,
  type Application,
  type ApplicationFilters,
  type FocusLens as FocusLensValue,
} from "@/lib/applications"
import {
  BOTTLENECK_STAGE_ID,
  STAGES,
  type AvailableRelease,
  type Diagnostics,
  type FlowMode,
} from "@/lib/track-data"
import { cn } from "@/lib/utils"

export default function TrackPage() {
  const [activeRelease, setActiveRelease] = useState<AvailableRelease>("track")
  const [mode, setMode] = useState<FlowMode>("simple")
  const [trackLevel, setTrackLevel] = useState<TrackLevel>("system")
  const [playing, setPlaying] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null)
  const [filters, setFilters] = useState<ApplicationFilters>(DEFAULT_APPLICATION_FILTERS)
  const [focusLens, setFocusLens] = useState<FocusLensValue>("all")
  const [stageListId, setStageListId] = useState<string | null>(null)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [returnToStage, setReturnToStage] = useState(false)

  const filteredApplications = useMemo(() => filterApplications(filters, focusLens), [filters, focusLens])
  const filterScale = useMemo(() => filteredPortfolioScale(filters, focusLens), [filters, focusLens])
  const falloutSampleSize = APPLICATIONS.filter(isFallout).length
  const falloutScale = focusLens === "fallout" ? filteredApplications.length / falloutSampleSize : filterScale
  const estimatedApplications =
    focusLens === "fallout" ? Math.round(7 * falloutScale) : Math.round(STAGES[0].counts.today * filterScale)
  const bottleneckCount = Math.round(
    (diagnostics?.bottleneck.queue ?? STAGES.find((stage) => stage.id === BOTTLENECK_STAGE_ID)!.counts.today) *
      (diagnostics ? 1 : filterScale),
  )

  const updateFilters = (nextFilters: ApplicationFilters) => {
    setFilters(nextFilters)
    setFocusId(null)
    setStageListId(null)
    setDiagnostics(null)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[100vw] flex-col gap-6 overflow-x-hidden px-4 py-6 md:max-w-[1480px] md:px-8">
      <TrackHeader activeRelease={activeRelease} onReleaseChange={setActiveRelease} />

      {activeRelease === "predict" ? (
        <PredictDashboard />
      ) : activeRelease === "simulate" ? (
        <SimulateDashboard />
      ) : (
        <>
          <TrackLevelSwitch
        value={trackLevel}
        onChange={(nextLevel) => {
          setTrackLevel(nextLevel)
          setExpanded(false)
          setStageListId(null)
          setSelectedApp(null)
          setReturnToStage(false)
        }}
      />

      <TrackFilters
        filters={filters}
        estimatedApplications={estimatedApplications}
        sampledApplications={filteredApplications.length}
        onChange={updateFilters}
      />

      <FocusLens
        value={focusLens}
        onChange={(nextFocus) => {
          setFocusLens(nextFocus)
          setFocusId(null)
          setStageListId(null)
          setDiagnostics(null)
        }}
      />

      {trackLevel === "system" ? (
        <>
          <KpiCards timeframe="today" scale={filterScale} focus={focusLens} falloutScale={falloutScale} />

          <div className={cn("grid min-w-0 grid-cols-1 gap-6", !expanded && "xl:grid-cols-[minmax(0,1fr)_360px]")}>
            <FlowPanel
              mode={mode}
              onModeChange={(nextMode) => {
                setMode(nextMode)
                setFocusId(null)
                setDiagnostics(null)
              }}
              playing={playing}
              onTogglePlay={() => setPlaying((current) => !current)}
              bottleneckId={BOTTLENECK_STAGE_ID}
              onSelectStage={setStageListId}
              expanded={expanded}
              onToggleExpand={() => setExpanded((current) => !current)}
              diagnostics={diagnostics}
              onDiagnostics={setDiagnostics}
              focusId={focusId}
              onFocus={setFocusId}
              filters={filters}
              focusLens={focusLens}
              filterScale={filterScale}
            />

            <InsightRail
              bottleneckCount={bottleneckCount}
              applications={filteredApplications}
              onOpenBottleneck={() => setStageListId(BOTTLENECK_STAGE_ID)}
              onOpenApplication={(application) => {
                setSelectedApp(application)
                setReturnToStage(false)
              }}
              onViewAll={() => setTrackLevel("application")}
              horizontal={expanded}
            />
          </div>
        </>
      ) : (
        <ApplicationControl
          applications={filteredApplications}
          onOpenApplication={(application) => {
            setSelectedApp(application)
            setReturnToStage(false)
          }}
        />
      )}

      <div className="flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="italic">Illustrative current-state data with a synthetic event replay. This is not a forecast or a live operational feed.</span>
      </div>

      <StageApplicationsDialog
        stageId={stageListId}
        open={stageListId !== null}
        onOpenChange={(open) => !open && setStageListId(null)}
        filters={filters}
        focus={focusLens}
        portfolioCount={
          stageListId
            ? Math.round((STAGES.find((stage) => stage.id === stageListId)?.counts.today ?? 0) * filterScale)
            : 0
        }
        onSelectApplication={(application) => {
          setSelectedApp(application)
          setReturnToStage(true)
          setStageListId(null)
        }}
      />

          <ApplicationDialog
        application={selectedApp}
        open={selectedApp !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedApp(null)
            setReturnToStage(false)
          }
        }}
        onBack={
          selectedApp && returnToStage
            ? () => {
                const stageId = selectedApp.stageId
                setSelectedApp(null)
                setReturnToStage(false)
                setStageListId(stageId)
              }
            : undefined
        }
      />
        </>
      )}
    </main>
  )
}
