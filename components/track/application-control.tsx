"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, ArrowRight, Building2, Clock3, Gauge, RotateCcw, Search } from "lucide-react"
import {
  CONNECTION_TYPE_COLORS,
  STATUS_META,
  applicationOwner,
  formatCapacity,
  isReturnedOrRework,
  type Application,
} from "@/lib/applications"
import { STAGES } from "@/lib/track-data"
import { TONE_BADGE } from "@/lib/track-ui"
import { cn } from "@/lib/utils"

interface ApplicationControlProps {
  applications: Application[]
  onOpenApplication: (application: Application) => void
}

const attentionOrder: Record<Application["status"], number> = {
  stuck: 0,
  returned: 1,
  "at-risk": 2,
  queued: 3,
  flowing: 4,
  withdrawn: 5,
  rejected: 5,
}

const importanceOrder: Record<Application["importance"], number> = { High: 0, Medium: 1, Low: 2 }
type CaseLens = "all" | "blocked" | "overdue" | "returned"
type SortMode = "urgency" | "capacity" | "dwell"

export function ApplicationControl({ applications, onOpenApplication }: ApplicationControlProps) {
  const [query, setQuery] = useState("")
  const [caseLens, setCaseLens] = useState<CaseLens>("all")
  const [sortMode, setSortMode] = useState<SortMode>("urgency")
  const normalisedQuery = query.trim().toLowerCase()

  const visibleApplications = useMemo(
    () =>
      [...applications]
        .filter((application) => {
          if (caseLens === "blocked" && application.blockers.length === 0) return false
          if (caseLens === "overdue" && application.daysInStage <= application.targetDays) return false
          if (caseLens === "returned" && !isReturnedOrRework(application)) return false
          if (!normalisedQuery) return true
          const stage = STAGES.find((item) => item.id === application.stageId)?.label ?? ""
          return [
            application.name,
            application.id,
            application.reference,
            application.descriptor,
            application.geography,
            application.connectionType,
            stage,
            applicationOwner(application),
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalisedQuery)
        })
        .sort((a, b) => compareApplications(a, b, sortMode)),
    [applications, caseLens, normalisedQuery, sortMode],
  )

  const blocked = applications.filter((application) => application.blockers.length > 0).length
  const aboveTarget = applications.filter((application) => application.daysInStage > application.targetDays).length
  const returned = applications.filter(isReturnedOrRework).length
  const representedCapacity = formatPortfolioCapacity(applications.reduce((total, application) => total + application.capacityMw, 0))
  const visibleCapacity = formatPortfolioCapacity(visibleApplications.reduce((total, application) => total + application.capacityMw, 0))

  const selectLens = (nextLens: CaseLens) => {
    setCaseLens(nextLens)
    if (sortMode === "capacity") setSortMode("urgency")
  }

  return (
    <section aria-label="Application control" className="min-w-0 rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10">
            <Building2 className="h-5 w-5 text-accent" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[0.68rem] font-bold uppercase text-accent">Application Insight</p>
            <h2 className="text-lg font-semibold text-foreground">Current application position and blockers</h2>
          </div>
        </div>

        <label className="relative block w-full sm:w-[320px]">
          <span className="sr-only">Search applications</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, ID, stage or owner"
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 border-y border-border sm:grid-cols-3 xl:grid-cols-5">
        <PortfolioMetric
          label="All matching cases"
          value={applications.length}
          icon={Building2}
          selected={caseLens === "all" && sortMode !== "capacity"}
          onClick={() => selectLens("all")}
        />
        <PortfolioMetric
          label="Capacity represented"
          value={representedCapacity}
          icon={Gauge}
          selected={caseLens === "all" && sortMode === "capacity"}
          onClick={() => {
            setCaseLens("all")
            setSortMode("capacity")
          }}
        />
        <PortfolioMetric
          label="Current blockers"
          value={blocked}
          icon={AlertTriangle}
          tone="danger"
          selected={caseLens === "blocked"}
          onClick={() => selectLens("blocked")}
        />
        <PortfolioMetric
          label="Above dwell target"
          value={aboveTarget}
          icon={Clock3}
          tone="warning"
          selected={caseLens === "overdue"}
          onClick={() => selectLens("overdue")}
        />
        <PortfolioMetric
          label="Returned / rework"
          value={returned}
          icon={RotateCcw}
          selected={caseLens === "returned"}
          onClick={() => selectLens("returned")}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{visibleApplications.length} cases in focus</span> · {visibleCapacity} represented
        </p>
        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          Order by
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-accent"
          >
            <option value="urgency">Current urgency</option>
            <option value="capacity">Largest connection capacity</option>
            <option value="dwell">Longest dwell above target</option>
          </select>
          <span className="hidden text-[0.68rem] lg:inline">Explicit current-state ordering</span>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1140px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-secondary/55 text-[0.68rem] font-bold uppercase text-muted-foreground">
              <th className="w-12 px-3 py-3 text-center">Order</th>
              <th className="px-4 py-3">Application</th>
              <th className="px-4 py-3">Connection</th>
              <th className="px-4 py-3">Current position</th>
              <th className="px-4 py-3">Why attention?</th>
              <th className="px-4 py-3">Current owner</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Application Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibleApplications.map((application, index) => {
              const stage = STAGES.find((item) => item.id === application.stageId)
              const status = STATUS_META[application.status]
              const daysOver = application.daysInStage - application.targetDays
              const blocker = application.blockers[0]
              const owner = applicationOwner(application)

              return (
                <tr key={application.id} className="transition-colors hover:bg-secondary/35">
                  <td className="px-3 py-3 text-center text-sm font-bold tabular-nums text-primary">{index + 1}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">{application.name}</p>
                    <p className="mt-0.5 font-mono text-xs font-semibold text-muted-foreground">{application.reference}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: CONNECTION_TYPE_COLORS[application.connectionType] }}
                        aria-hidden="true"
                      />
                      {application.connectionType}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatCapacity(application.capacityMw)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="max-w-[180px] text-sm font-medium text-foreground">{stage?.label}</p>
                    <p className={cn("mt-0.5 text-xs", daysOver > 0 ? "font-semibold text-danger" : "text-muted-foreground")}>
                      {application.daysInStage} days in stage{daysOver > 0 ? ` · ${daysOver} above target` : " · within target"}
                    </p>
                  </td>
                  <td className="max-w-[260px] px-4 py-3">
                    <p className={cn("text-sm font-medium", blocker ? "text-foreground" : "text-success")}>
                      {blocker?.label ?? "No current blocker"}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{application.summary}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{owner}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded px-2 py-1 text-[0.7rem] font-semibold", TONE_BADGE[status.tone])}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onOpenApplication(application)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-secondary"
                    >
                      Review and act
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {visibleApplications.length === 0 && (
        <div className="border-t border-border px-5 py-10 text-center">
          <p className="text-sm font-semibold text-foreground">No matching applications</p>
          <p className="mt-1 text-xs text-muted-foreground">Adjust the search, filters or current focus lens.</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <span>{visibleApplications.length} of {applications.length} detailed examples shown</span>
        <span>{visibleCapacity} represented · current-state records</span>
      </div>
    </section>
  )
}

function PortfolioMetric({
  label,
  value,
  icon: Icon,
  tone = "accent",
  selected,
  onClick,
}: {
  label: string
  value: number | string
  icon: typeof Building2
  tone?: "accent" | "danger" | "warning"
  selected: boolean
  onClick: () => void
}) {
  const toneClass = {
    accent: "text-accent",
    danger: "text-danger",
    warning: "text-queue",
  }[tone]

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-[82px] items-center gap-3 border-b border-r border-border px-4 py-3 text-left transition-colors hover:bg-secondary/60 xl:border-b-0",
        selected && "bg-accent/7 ring-1 ring-inset ring-accent/40",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", toneClass)} aria-hidden="true" />
      <div>
        <p className={cn("text-xl font-bold tabular-nums", toneClass)}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </button>
  )
}

function compareApplications(a: Application, b: Application, sortMode: SortMode): number {
  const urgency =
    attentionOrder[a.status] - attentionOrder[b.status] ||
    importanceOrder[a.importance] - importanceOrder[b.importance] ||
    b.capacityMw - a.capacityMw ||
    b.daysInStage - b.targetDays - (a.daysInStage - a.targetDays)

  if (sortMode === "capacity") return b.capacityMw - a.capacityMw || urgency
  if (sortMode === "dwell") {
    return b.daysInStage - b.targetDays - (a.daysInStage - a.targetDays) || urgency
  }
  return urgency
}

function formatPortfolioCapacity(capacityMw: number): string {
  if (capacityMw === 0) return "0 GW"
  return `${Number((capacityMw / 1000).toFixed(2))} GW`
}
