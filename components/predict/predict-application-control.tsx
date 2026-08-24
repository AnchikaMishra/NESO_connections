"use client"

import { useMemo, useState } from "react"
import {
  ArrowUpDown,
  CalendarClock,
  ChevronRight,
  CircleGauge,
  Clock3,
  Search,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react"
import { STAGES } from "@/lib/track-data"
import { formatCapacity, type Application } from "@/lib/applications"
import { APPLICATION_RISK_META, applicationForecast, type ForecastHorizon } from "@/lib/predict-data"
import { cn } from "@/lib/utils"

interface PredictApplicationControlProps {
  applications: Application[]
  horizon: ForecastHorizon
  onOpenApplication: (application: Application) => void
}

type RiskFilter = "all" | "high" | "medium" | "low"
type FocusFilter = "all" | "within-horizon" | "strategic"
type ForecastSort = "risk" | "capacity" | "soonest" | "confidence"

const RISK_FILTERS: Array<{ value: RiskFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
]

export function PredictApplicationControl({
  applications,
  horizon,
  onOpenApplication,
}: PredictApplicationControlProps) {
  const [search, setSearch] = useState("")
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all")
  const [focusFilter, setFocusFilter] = useState<FocusFilter>("all")
  const [sort, setSort] = useState<ForecastSort>("risk")
  const [includeCurrentlyStuck, setIncludeCurrentlyStuck] = useState(true)
  const forecasts = useMemo(
    () => applications.map((application) => applicationForecast(application, horizon)),
    [applications, horizon],
  )
  const persistentRiskCount = forecasts.filter((forecast) => forecast.application.status === "stuck").length
  const candidateForecasts = useMemo(
    () =>
      includeCurrentlyStuck
        ? forecasts
        : forecasts.filter((forecast) => forecast.application.status !== "stuck"),
    [forecasts, includeCurrentlyStuck],
  )

  const metrics = useMemo(() => {
    const high = candidateForecasts.filter((forecast) => forecast.riskBand === "high")
    const withinHorizon = candidateForecasts.filter(
      (forecast) => forecast.daysToThreshold !== null && forecast.daysToThreshold <= horizon,
    )
    const strategic = candidateForecasts.filter((forecast) => forecast.application.importance === "High")
    return {
      high,
      highCapacity: high.reduce((total, forecast) => total + forecast.application.capacityMw, 0),
      withinHorizon,
      strategic,
    }
  }, [candidateForecasts, horizon])

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    const result = candidateForecasts.filter((forecast) => {
      const matchesSearch =
        !query ||
        `${forecast.application.name} ${forecast.application.reference} ${forecast.application.descriptor} ${forecast.failureStage.label}`
          .toLowerCase()
          .includes(query)
      if (!matchesSearch) return false
      if (riskFilter !== "all" && forecast.riskBand !== riskFilter) return false
      if (focusFilter === "within-horizon") {
        return forecast.daysToThreshold !== null && forecast.daysToThreshold <= horizon
      }
      if (focusFilter === "strategic") return forecast.application.importance === "High"
      return true
    })

    return result.sort((a, b) => {
      if (sort === "capacity") return b.application.capacityMw - a.application.capacityMw
      if (sort === "soonest") {
        return (a.daysToThreshold ?? Number.MAX_SAFE_INTEGER) - (b.daysToThreshold ?? Number.MAX_SAFE_INTEGER)
      }
      if (sort === "confidence") return b.confidence - a.confidence
      return b.risk - a.risk || b.application.capacityMw - a.application.capacityMw
    })
  }, [candidateForecasts, focusFilter, horizon, riskFilter, search, sort])

  const resetFilters = () => {
    setRiskFilter("all")
    setFocusFilter("all")
  }

  return (
    <section className="min-w-0 rounded-lg border border-border bg-card shadow-sm" aria-label="Application forecasts">
      <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[0.68rem] font-bold uppercase text-anticipate">Application Insight</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">Application risk register</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Applications most likely to stall or delay over the next {horizon} days.
          </p>
        </div>
        <div className="flex items-start gap-2 border-l-2 border-anticipate pl-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-anticipate" aria-hidden="true" />
          <span className="max-w-[290px]"><strong className="text-foreground">Illustrative forecast</strong> | Human review required</span>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-border lg:grid-cols-4">
        <MetricButton
          active={riskFilter === "all" && focusFilter === "all"}
          icon={CalendarClock}
          label="Forecast candidates"
          value={candidateForecasts.length}
          detail={includeCurrentlyStuck ? "including current stalls" : "not currently stuck"}
          onClick={resetFilters}
        />
        <MetricButton
          active={riskFilter === "high" && focusFilter === "all"}
          icon={TriangleAlert}
          label="High risk"
          value={metrics.high.length}
          detail={formatCapacity(metrics.highCapacity)}
          tone="danger"
          onClick={() => {
            setRiskFilter("high")
            setFocusFilter("all")
          }}
        />
        <MetricButton
          active={focusFilter === "within-horizon"}
          icon={Clock3}
          label="Threshold within horizon"
          value={metrics.withinHorizon.length}
          detail={`within ${horizon} days`}
          tone="warning"
          onClick={() => {
            setRiskFilter("all")
            setFocusFilter("within-horizon")
          }}
        />
        <MetricButton
          active={focusFilter === "strategic"}
          icon={CircleGauge}
          label="Strategic applications"
          value={metrics.strategic.length}
          detail="high importance"
          onClick={() => {
            setRiskFilter("all")
            setFocusFilter("strategic")
          }}
        />
      </div>

      <div className="flex flex-col gap-3 border-b border-border bg-secondary/30 p-4 xl:flex-row xl:items-center xl:justify-between">
        <label className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Search forecast applications</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search application name or reference"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
        </label>
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-end">
          <fieldset className="flex items-center gap-2">
            <legend className="sr-only">Risk filter</legend>
            <span className="text-xs font-semibold text-muted-foreground">Risk</span>
            <div className="flex rounded-md border border-border bg-background p-1" role="group" aria-label="Predicted risk">
              {RISK_FILTERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setRiskFilter(option.value)
                    setFocusFilter("all")
                  }}
                  aria-pressed={riskFilter === option.value && focusFilter === "all"}
                  className={cn(
                    "h-7 rounded px-2 text-[0.68rem] font-semibold transition-colors",
                    riskFilter === option.value && focusFilter === "all"
                      ? "bg-anticipate text-white shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-semibold text-muted-foreground">
            <input
              type="checkbox"
              checked={includeCurrentlyStuck}
              onChange={(event) => setIncludeCurrentlyStuck(event.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--anticipate)]"
            />
            Include currently stuck ({persistentRiskCount})
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
            Order by
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as ForecastSort)}
              className="h-9 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-accent"
            >
              <option value="risk">Highest forecast risk</option>
              <option value="capacity">Largest connection capacity</option>
              <option value="soonest">Soonest failure point</option>
              <option value="confidence">Highest confidence</option>
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] table-fixed text-left">
          <thead className="border-b border-border bg-secondary/40 text-[0.65rem] font-bold uppercase text-muted-foreground">
            <tr>
              <th className="w-[18%] px-4 py-3">Application</th>
              <th className="w-[12%] px-3 py-3">Technology / type</th>
              <th className="w-[13%] px-3 py-3">Current stage</th>
              <th className="w-[22%] px-3 py-3">Predicted issue</th>
              <th className="w-[9%] px-3 py-3">Risk</th>
              <th className="w-[10%] px-3 py-3">Illustrative confidence</th>
              <th className="w-[12%] px-3 py-3">Why flagged</th>
              <th className="w-[8%] px-3 py-3 text-right">Review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((forecast, index) => {
              const currentStage = STAGES.find((stage) => stage.id === forecast.application.stageId)
              const topDriver = forecast.drivers[0]
              return (
                <tr key={forecast.application.id} className="transition-colors hover:bg-secondary/35">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-secondary text-[0.65rem] font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">{forecast.application.name}</span>
                        <span className="mt-0.5 block truncate font-mono text-xs font-semibold text-muted-foreground">
                          {forecast.application.reference}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{forecast.application.geography}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    <span className="block font-semibold text-foreground">{forecast.application.descriptor}</span>
                    <span className="mt-0.5 block">{forecast.application.technology}</span>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    <span className="block font-semibold text-foreground">{currentStage?.label ?? "Current stage"}</span>
                    <span className="mt-0.5 block tabular-nums">{forecast.application.daysInStage} days in stage</span>
                    {forecast.application.status === "stuck" && (
                      <span className="mt-1 inline-flex rounded bg-danger-muted px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-danger">
                        Current stall
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="line-clamp-2 text-xs font-semibold leading-relaxed text-foreground">{forecast.predictedIssue}</span>
                    <span className="mt-1 block text-[0.62rem] text-muted-foreground">
                      Likely at {forecast.failureStage.label}
                      {forecast.daysToThreshold !== null && ` | ${forecast.daysToThreshold === 0 ? "threshold reached" : `~${forecast.daysToThreshold} days`}`}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn("inline-flex rounded px-2 py-1 text-xs font-bold", APPLICATION_RISK_META[forecast.riskBand].className)}>
                      {APPLICATION_RISK_META[forecast.riskBand].label}
                    </span>
                    <span className="mt-1 block text-[0.62rem] tabular-nums text-muted-foreground">~{approximatePercent(forecast.risk)}% likelihood</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="block text-sm font-bold tabular-nums text-primary">{forecast.confidence}%</span>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    <span className="block font-semibold text-foreground">{topDriver.label}</span>
                    <span className={cn(
                      "mt-1 inline-flex rounded px-1.5 py-0.5 text-[0.58rem] font-bold uppercase",
                      contributionClass(topDriver.contribution),
                    )}>
                      {topDriver.contribution} contribution
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onOpenApplication(forecast.application)}
                      aria-label={`Investigate application ${forecast.application.name}`}
                      title={`Investigate application ${forecast.application.name}`}
                      className="inline-flex h-8 items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold text-primary transition-colors hover:bg-secondary"
                    >
                      Investigate
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {visible.length === 0 && (
        <p className="border-t border-border px-5 py-8 text-center text-sm text-muted-foreground">
          No forecast applications match the current search and filters.
        </p>
      )}
    </section>
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

function MetricButton({
  active,
  icon: Icon,
  label,
  value,
  detail,
  tone = "primary",
  onClick,
}: {
  active: boolean
  icon: typeof CalendarClock
  label: string
  value: string | number
  detail: string
  tone?: "primary" | "warning" | "danger"
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-[88px] items-start gap-3 border-r border-border p-3.5 text-left transition-colors last:border-r-0 hover:bg-secondary/45",
        active && "bg-anticipate-muted/35 shadow-[inset_0_-2px_0_var(--anticipate)]",
      )}
    >
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", tone === "danger" ? "bg-danger-muted" : tone === "warning" ? "bg-queue-muted" : "bg-primary/10")}>
        <Icon className={cn("h-4 w-4", tone === "danger" ? "text-danger" : tone === "warning" ? "text-queue" : "text-primary")} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.62rem] font-semibold uppercase text-muted-foreground">{label}</span>
        <span className={cn("mt-1 block text-lg font-bold tabular-nums", tone === "danger" ? "text-danger" : tone === "warning" ? "text-queue" : "text-primary")}>
          {value}
        </span>
        <span className="mt-0.5 block text-[0.68rem] text-muted-foreground">{detail}</span>
      </span>
    </button>
  )
}
