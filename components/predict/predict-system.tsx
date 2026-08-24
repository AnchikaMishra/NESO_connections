"use client"

import { useMemo, useState } from "react"
import {
  Activity,
  ArrowRight,
  CalendarClock,
  ChevronRight,
  HelpCircle,
  Network,
  Pause,
  Play,
  Search,
  ShieldCheck,
  TrendingUp,
  TriangleAlert,
} from "lucide-react"
import type { Application, ApplicationFilters } from "@/lib/applications"
import { formatCapacity } from "@/lib/applications"
import {
  APPLICATION_RISK_META,
  FORECAST_RISK_META,
  applicationForecast,
  cohortForecastsFor,
  forecastRiskForStage,
  forecastStageCounts,
  forecastStageDetail,
  systemForecastInsights,
  type ApplicationForecast,
  type ForecastHorizon,
  type SystemForecastInsight,
  type SystemInsightId,
} from "@/lib/predict-data"
import { PipelineFlow } from "@/components/track/pipeline-flow"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface PredictSystemProps {
  applications: Application[]
  filters: ApplicationFilters
  filterScale: number
  horizon: ForecastHorizon
  onOpenApplication: (application: Application) => void
  onViewAllPredictedRisks: () => void
}

const HORIZON_MONTH: Record<ForecastHorizon, number> = { 30: 1, 60: 2, 90: 3 }
const ignoreDiagnostics = () => undefined

export function PredictSystem({
  applications,
  filters,
  filterScale,
  horizon,
  onOpenApplication,
  onViewAllPredictedRisks,
}: PredictSystemProps) {
  const [playing, setPlaying] = useState(true)
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null)
  const stageCounts = useMemo(() => forecastStageCounts(horizon, filterScale), [horizon, filterScale])
  const systemInsights = useMemo(() => systemForecastInsights(horizon), [horizon])
  const offerForecast = useMemo(() => forecastStageDetail("offer-issued", horizon), [horizon])
  const forecasts = useMemo(
    () => applications.map((application) => applicationForecast(application, horizon)),
    [applications, horizon],
  )
  const highestRisk = forecasts
    .filter((forecast) => forecast.application.status !== "stuck")
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 3)
  const stagePressures = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(stageCounts).map((stageId) => {
          const risk = forecastRiskForStage(stageId, horizon)
          return [stageId, risk === "constrained" ? 1 : risk === "emerging" ? 0.68 : risk === "watch" ? 0.4 : 0.08]
        }),
      ),
    [horizon, stageCounts],
  )
  const stageAppCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const forecast of forecasts) counts[forecast.failureStageId] = (counts[forecast.failureStageId] ?? 0) + 1
    return counts
  }, [forecasts])

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {systemInsights.map((insight) => (
          <ForecastInsight key={insight.id} insight={insight} />
        ))}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section
          aria-label="Connections system forecast"
          className="flex min-w-0 max-w-full flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[0.68rem] font-bold uppercase text-anticipate">
                <span className={cn("h-2 w-2 rounded-full", playing ? "animate-pulse bg-anticipate" : "bg-muted-foreground")} />
                {playing ? "Forecast running" : "Forecast paused"}
              </div>
              <h2 className="text-lg font-semibold text-foreground">Forecast Marble Run</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Observed stage counts alongside the {horizon}-day illustrative forecast.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPlaying((current) => !current)}
              aria-label={playing ? "Pause forecast animation" : "Resume forecast animation"}
              title={playing ? "Pause forecast animation" : "Resume forecast animation"}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-primary transition-colors hover:bg-secondary"
            >
              {playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>

          <div className="marble-workspace max-h-[500px] overflow-auto border-y border-border py-2 pr-1">
            <div className="w-fit min-w-full">
              <div className="mx-auto w-fit">
                <PipelineFlow
                  mode="simple"
                  playing={playing}
                  bottleneckId="offer-issued"
                  bottleneckLabel="Emerging"
                  onSelectStage={setSelectedStageId}
                  focusId={null}
                  onDiagnostics={ignoreDiagnostics}
                  filters={filters}
                  focusLens="all"
                  filterScale={filterScale}
                  month={HORIZON_MONTH[horizon]}
                  stageCounts={stageCounts}
                  stagePressures={stagePressures}
                  stageAppCounts={stageAppCounts}
                  forecastView
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[0.68rem] font-bold uppercase text-anticipate">Marble Run Insight</p>
              <h3 className="text-sm font-semibold text-foreground">Where is flow likely to degrade next?</h3>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[0.68rem] text-muted-foreground">
              <span className="font-semibold">Forecast status:</span>
              {(["stable", "watch", "emerging", "constrained"] as const).map((risk) => (
                <span key={risk} className="flex items-center gap-1.5">
                  <span className={cn("h-2.5 w-2.5 rounded-full", FORECAST_RISK_META[risk].className.split(" ")[0])} />
                  {FORECAST_RISK_META[risk].label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <aside className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-5 shadow-sm">
          <section>
            <p className="text-[0.68rem] font-bold uppercase text-anticipate">Predictive Marble Run Insight</p>
            <p className="mt-2 text-xs font-semibold text-muted-foreground">Next likely bottleneck</p>
            <div className="mt-2 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-danger-muted">
                <TrendingUp className="h-5 w-5 text-danger" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{offerForecast.stage.label}</h2>
                <p className="mt-0.5 text-xs font-semibold text-danger">
                  High likelihood over next {horizon} days | ~{Math.ceil((offerForecast.timeToConstraintDays ?? 21) / 7)} weeks
                </p>
              </div>
            </div>

            <div className="mt-3 border-y border-border py-3">
              <p className="text-[0.65rem] font-bold uppercase text-muted-foreground">Why</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{offerForecast.drivers[0].detail}</p>
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span><strong className="text-foreground">{offerForecast.arrivalsPerWeek}</strong> arriving / week</span>
                <span><strong className="text-foreground">{offerForecast.capacityPerWeek}</strong> capacity / week</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedStageId("offer-issued")}
                className="flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-border px-2 text-xs font-semibold text-primary transition-colors hover:bg-secondary"
              >
                <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Why this prediction?
              </button>
              <button
                type="button"
                onClick={() => setSelectedStageId("offer-issued")}
                className="flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                Investigate stage
              </button>
            </div>
          </section>

          <section className="mt-5 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.68rem] font-bold uppercase text-anticipate">Application Insight</p>
                <h3 className="text-sm font-semibold text-foreground">Applications at elevated risk</h3>
              </div>
              <span className="text-right text-[0.62rem] leading-tight text-muted-foreground">Predicted /<br />illustrative</span>
            </div>
            {highestRisk.length ? (
              <div className="mt-2 divide-y divide-border border-y border-border">
                {highestRisk.map((forecast) => (
                  <button
                    key={forecast.application.id}
                    type="button"
                    onClick={() => onOpenApplication(forecast.application)}
                    className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-secondary/50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-foreground">{forecast.application.name}</span>
                      <span className="mt-0.5 block text-[0.62rem] font-semibold text-muted-foreground">
                        {APPLICATION_RISK_META[forecast.riskBand].label} risk | {forecast.confidence}% illustrative confidence
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[0.6rem] text-muted-foreground">
                        {forecast.application.reference} | {formatCapacity(forecast.application.capacityMw)}
                      </span>
                    </span>
                    <span className={cn("rounded px-1.5 py-0.5 text-[0.62rem] font-bold", APPLICATION_RISK_META[forecast.riskBand].className)}>
                      {forecast.probability}%
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 border-y border-border py-3 text-xs text-muted-foreground">
                No not-yet-stuck examples match the current filters.
              </p>
            )}
            <button
              type="button"
              onClick={onViewAllPredictedRisks}
              className="mt-3 flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left text-xs font-semibold text-primary transition-colors hover:bg-secondary"
            >
              View all predicted risks
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </section>

          <section className="mt-5 border-t border-border pt-4">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-foreground">Illustrative forecast | Human review required</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  The AI has surfaced the emerging issue and explained why. It has not decided what NESO should do.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <StageForecastDialog
        stageId={selectedStageId}
        horizon={horizon}
        filterScale={filterScale}
        forecasts={forecasts}
        open={selectedStageId !== null}
        onOpenChange={(open) => !open && setSelectedStageId(null)}
        onOpenApplication={(application) => {
          setSelectedStageId(null)
          onOpenApplication(application)
        }}
        onViewAffectedApplications={() => {
          setSelectedStageId(null)
          onViewAllPredictedRisks()
        }}
      />
    </>
  )
}

const INSIGHT_ICONS: Record<SystemInsightId, typeof Network> = {
  "next-bottleneck": TriangleAlert,
  "emerging-constraint": TrendingUp,
  "flow-degradation": ArrowRight,
  "at-risk-cohort": Activity,
}

function ForecastInsight({ insight }: { insight: SystemForecastInsight }) {
  const Icon = INSIGHT_ICONS[insight.id]

  return (
    <article className="flex min-h-[104px] items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
          insight.tone === "danger" ? "bg-danger-muted" : insight.tone === "warning" ? "bg-queue-muted" : "bg-primary/10",
        )}
      >
        <Icon
          className={cn("h-4 w-4", insight.tone === "danger" ? "text-danger" : insight.tone === "warning" ? "text-queue" : "text-primary")}
          aria-hidden="true"
        />
      </span>
      <div className="min-w-0">
        <p className="text-[0.65rem] font-semibold uppercase text-muted-foreground">{insight.label}</p>
        <p className={cn("mt-1 text-base font-bold", insight.tone === "danger" ? "text-danger" : insight.tone === "warning" ? "text-queue" : "text-primary")}>
          {insight.value}
        </p>
        <p className="mt-0.5 text-[0.68rem] leading-snug text-muted-foreground">{insight.detail}</p>
      </div>
    </article>
  )
}

function StageForecastDialog({
  stageId,
  horizon,
  filterScale,
  forecasts,
  open,
  onOpenChange,
  onOpenApplication,
  onViewAffectedApplications,
}: {
  stageId: string | null
  horizon: ForecastHorizon
  filterScale: number
  forecasts: ApplicationForecast[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenApplication: (application: Application) => void
  onViewAffectedApplications: () => void
}) {
  const detail = forecastStageDetail(stageId ?? "app-submitted", horizon, filterScale)
  const affected = forecasts
    .filter((forecast) => forecast.failureStageId === stageId)
    .sort((a, b) => b.risk - a.risk)
  const affectedCohorts = cohortForecastsFor(horizon)
    .filter((cohort) => cohort.affectedStageId === detail.stageId)
    .sort((a, b) => b.probability - a.probability)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <div className="flex items-start gap-3 pr-8">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-anticipate-muted">
            <CalendarClock className="h-5 w-5 text-anticipate" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[0.68rem] font-bold uppercase text-anticipate">Stage Forecast</p>
            <DialogTitle>{detail.stage.label}</DialogTitle>
            <DialogDescription className="mt-1">Predicted / illustrative position at the {horizon}-day horizon.</DialogDescription>
            <p className="mt-2 text-[0.65rem] font-semibold text-muted-foreground">
              System signal -&gt; stage -&gt; affected cohort -&gt; application
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 border-y border-border py-4 sm:grid-cols-5">
          <StageMetric label="Current" value={detail.current} />
          <StageMetric label="Predicted" value={detail.projected} tone={detail.change > 0 ? "danger" : "primary"} />
          <StageMetric label="Net change" value={`${detail.change >= 0 ? "+" : ""}${detail.change}`} tone={detail.change > 0 ? "warning" : "primary"} />
          <StageMetric label="Arrivals / week" value={detail.arrivals} />
          <StageMetric label="Capacity / week" value={detail.capacity} />
        </dl>

        <section>
          <p className="text-[0.68rem] font-bold uppercase text-anticipate">Why This Prediction?</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded px-2 py-1 text-xs font-bold", FORECAST_RISK_META[detail.risk].className)}>
              {FORECAST_RISK_META[detail.risk].label}
            </span>
            <span className="text-xs text-muted-foreground">~{approximatePercent(detail.probability)}% illustrative likelihood</span>
            <span className="text-xs text-muted-foreground">{detail.confidence}% illustrative confidence</span>
            {detail.timeToConstraintDays !== null && (
              <span className="text-xs text-muted-foreground">~{Math.ceil(detail.timeToConstraintDays / 7)} weeks to constraint</span>
            )}
          </div>
          <div className="mt-3 divide-y divide-border border-y border-border">
            {detail.drivers.map((driver, index) => (
              <div key={driver.label} className="flex items-start gap-3 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-queue-muted text-xs font-bold text-queue">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{driver.label}</p>
                    <span className={cn("rounded px-2 py-0.5 text-[0.6rem] font-bold uppercase", contributionClass(driver.contribution))}>
                      {driver.contribution} contribution
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{driver.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.68rem] font-bold uppercase text-anticipate">Affected Cohort</p>
              <h3 className="text-sm font-semibold text-foreground">Who is contributing to the pressure?</h3>
            </div>
            <span className="text-xs text-muted-foreground">{affectedCohorts.length} cohort signals</span>
          </div>
          {affectedCohorts.length ? (
            <div className="divide-y divide-border border-y border-border">
              {affectedCohorts.map((cohort) => (
                <div key={`${cohort.cohort}-${cohort.segment}`} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{cohort.segment}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{cohort.cohort} | {cohort.drivers[0]}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums text-primary">{cohort.shareOfArrivals}%</p>
                    <p className="text-[0.62rem] text-muted-foreground">of forecast arrivals</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="border-y border-border py-3 text-xs text-muted-foreground">
              No material cohort concentration is forecast for this stage.
            </p>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.68rem] font-bold uppercase text-anticipate">Contributing Applications</p>
              <h3 className="text-sm font-semibold text-foreground">Open an individual predicted risk</h3>
            </div>
            <span className="text-xs text-muted-foreground">{affected.length} detailed examples</span>
          </div>
          {affected.length ? (
            <div className="divide-y divide-border border-y border-border">
              {affected.map((forecast) => (
                <button
                  key={forecast.application.id}
                  type="button"
                  onClick={() => onOpenApplication(forecast.application)}
                  className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-secondary/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{forecast.application.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      <span className="font-mono font-semibold">{forecast.application.reference}</span> | {forecast.outcome}
                    </span>
                  </span>
                  <span className={cn("rounded px-1.5 py-0.5 text-[0.65rem] font-bold", APPLICATION_RISK_META[forecast.riskBand].className)}>
                    {forecast.risk}%
                  </span>
                  <span className="text-[0.65rem] font-semibold text-primary">Investigate application</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : (
            <p className="border-y border-border py-4 text-sm text-muted-foreground">
              No detailed application examples match this stage and the current filters.
            </p>
          )}
        </section>

        <div className="flex flex-col gap-3 border border-anticipate/25 bg-anticipate-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-anticipate" aria-hidden="true" />
            <span>Forecast explanation only. Human review is required.</span>
          </div>
          <button
            type="button"
            onClick={onViewAffectedApplications}
            className="flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            View affected applications
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StageMetric({ label, value, tone = "primary" }: { label: string; value: string | number; tone?: "primary" | "warning" | "danger" }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.62rem] font-semibold uppercase text-muted-foreground">{label}</dt>
      <dd className={cn("mt-1 text-lg font-bold tabular-nums", tone === "danger" ? "text-danger" : tone === "warning" ? "text-queue" : "text-primary")}>
        {value}
      </dd>
    </div>
  )
}

function contributionClass(contribution: "high" | "medium" | "low") {
  if (contribution === "high") return "bg-danger-muted text-danger"
  if (contribution === "medium") return "bg-anticipate-muted text-anticipate"
  return "bg-success-muted text-success"
}

function approximatePercent(value: number) {
  return Math.round(value / 5) * 5
}
