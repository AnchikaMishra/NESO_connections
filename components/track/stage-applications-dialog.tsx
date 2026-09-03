"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronRight, Clock3, Layers, RotateCcw, ShieldAlert, TriangleAlert } from "lucide-react"
import { STAGES } from "@/lib/track-data"
import {
  STATUS_META,
  applicationsAtStage,
  isReturnedOrRework,
  type Application,
  type ApplicationFilters,
  type FocusLens,
} from "@/lib/applications"
import { TONE_BADGE } from "@/lib/track-ui"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface StageApplicationsDialogProps {
  stageId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectApplication: (application: Application) => void
  filters: ApplicationFilters
  focus: FocusLens
  portfolioCount: number
}

type StageSort = "longest" | "blocked" | "returned" | "importance" | "technology" | "geography"

const importanceRank = { High: 0, Medium: 1, Low: 2 }

export function StageApplicationsDialog({
  stageId,
  open,
  onOpenChange,
  onSelectApplication,
  filters,
  focus,
  portfolioCount,
}: StageApplicationsDialogProps) {
  const [sort, setSort] = useState<StageSort>("longest")
  const stage = stageId ? STAGES.find((item) => item.id === stageId) : null
  const applications = useMemo(
    () => (stageId ? applicationsAtStage(stageId, filters, focus) : []),
    [stageId, filters, focus],
  )

  useEffect(() => setSort("longest"), [stageId])

  const sorted = useMemo(() => {
    const result = [...applications]
    result.sort((a, b) => {
      if (sort === "blocked") return Number(b.blockers.length > 0) - Number(a.blockers.length > 0) || b.daysInStage - a.daysInStage
      if (sort === "returned") return Number(isReturnedOrRework(b)) - Number(isReturnedOrRework(a)) || b.daysInStage - a.daysInStage
      if (sort === "importance") return importanceRank[a.importance] - importanceRank[b.importance]
      if (sort === "technology") return a.technology.localeCompare(b.technology)
      if (sort === "geography") return a.geography.localeCompare(b.geography)
      return b.daysInStage - a.daysInStage
    })
    return result
  }, [applications, sort])

  const dwellValues = applications.map((application) => application.daysInStage).sort((a, b) => a - b)
  const medianDwell = dwellValues.length ? dwellValues[Math.floor(dwellValues.length / 2)] : stage?.kind === "bottleneck" ? 46 : 24
  const longestDwell = dwellValues.at(-1) ?? (stage?.kind === "bottleneck" ? 74 : 31)
  const estimate = (count: number) =>
    applications.length ? Math.min(portfolioCount, Math.round((count / applications.length) * portfolioCount)) : 0
  const blocked = estimate(applications.filter((application) => application.blockers.length > 0).length)
  const aboveDwell = estimate(applications.filter((application) => application.daysInStage > application.targetDays).length)
  const returned = estimate(applications.filter(isReturnedOrRework).length)
  const reasonBreakdown = buildReasonBreakdown(stageId, portfolioCount, applications)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <div className="flex items-start gap-3 pr-8">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-accent/10">
            <Layers className="h-6 w-6 text-accent" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[0.68rem] font-bold uppercase text-accent">Stage Insight</p>
            <DialogTitle>{stage?.label ?? "Current stage"}</DialogTitle>
            <DialogDescription className="mt-1">
              Current observed stage information and applications contributing to this position.
            </DialogDescription>
          </div>
        </div>

        <section>
          <p className="text-[0.68rem] font-bold uppercase text-muted-foreground">Current stage position</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{portfolioCount} applications</p>
        </section>

        <dl className="grid grid-cols-2 gap-3 border-y border-border py-4 md:grid-cols-5">
          <StageMetric icon={Clock3} label="Median dwell" value={`${medianDwell} days`} />
          <StageMetric icon={Clock3} label="Longest dwell" value={`${longestDwell} days`} tone="danger" />
          <StageMetric icon={TriangleAlert} label="Above expected dwell" value={aboveDwell} tone="warning" />
          <StageMetric icon={ShieldAlert} label="Currently blocked" value={blocked} tone="danger" />
          <StageMetric icon={RotateCcw} label="Returned / rework" value={returned} />
        </dl>

        {reasonBreakdown.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-foreground">Current blocker / reason breakdown</h3>
            <div className="mt-2 grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
              {reasonBreakdown.map((reason) => (
                <div key={reason.label} className="flex items-center justify-between gap-3 border-b border-border py-1.5 text-xs">
                  <span className="text-muted-foreground">{reason.label}</span>
                  <span className="font-bold tabular-nums text-foreground">{reason.count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[0.68rem] font-bold uppercase text-accent">Applications at this stage</p>
              <h3 className="text-sm font-semibold text-foreground">{applications.length} detailed examples</h3>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              Sort by
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as StageSort)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-accent"
              >
                <option value="longest">Longest dwell</option>
                <option value="blocked">Blocked first</option>
                <option value="returned">Returned / rework</option>
                <option value="importance">Strategic importance</option>
                <option value="technology">Technology</option>
                <option value="geography">Geography</option>
              </select>
            </label>
          </div>

          {sorted.length ? (
            <ul className="divide-y divide-border border-y border-border">
              {sorted.map((application) => {
                const status = STATUS_META[application.status]
                const overdue = application.daysInStage > application.targetDays
                return (
                  <li key={application.id}>
                    <button
                      type="button"
                      onClick={() => onSelectApplication(application)}
                      className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-secondary/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-foreground">{application.name}</span>
                          <span className={cn("rounded px-1.5 py-0.5 text-[0.65rem] font-semibold", TONE_BADGE[status.tone])}>{status.label}</span>
                        </div>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          <span className="font-mono font-semibold">{application.reference}</span> · {application.descriptor} · {application.geography} · {application.blockers.length} current blocker{application.blockers.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <span className={cn("text-xs tabular-nums text-muted-foreground", overdue && "font-semibold text-danger")}>{application.daysInStage} days</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="border-y border-border py-4 text-sm text-muted-foreground">No detailed examples at this stage match the current filters and focus.</p>
          )}
        </section>
      </DialogContent>
    </Dialog>
  )
}

function StageMetric({
  icon: Icon,
  label,
  value,
  tone = "primary",
}: {
  icon: typeof Clock3
  label: string
  value: string | number
  tone?: "primary" | "warning" | "danger"
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase text-muted-foreground">
        <Icon className={cn("h-3.5 w-3.5", tone === "danger" ? "text-danger" : tone === "warning" ? "text-queue" : "text-accent")} aria-hidden="true" />
        {label}
      </dt>
      <dd className={cn("mt-1 text-base font-bold tabular-nums", tone === "danger" ? "text-danger" : tone === "warning" ? "text-queue" : "text-primary")}>{value}</dd>
    </div>
  )
}

function buildReasonBreakdown(stageId: string | null, portfolioCount: number, applications: Application[]) {
  if (stageId === "to-design") {
    const scale = portfolioCount / 48
    return [
      ["Awaiting applicant information", 14],
      ["Design clarification", 11],
      ["Internal review", 8],
      ["Dependency outstanding", 7],
      ["Returned / rework", 5],
      ["Other current reason", 3],
    ].map(([label, count]) => ({ label: label as string, count: Math.round((count as number) * scale) }))
  }

  const groups = new Map<string, number>()
  for (const application of applications) {
    for (const blocker of application.blockers) groups.set(blocker.label, (groups.get(blocker.label) ?? 0) + 1)
  }
  return [...groups.entries()].slice(0, 6).map(([label, count]) => ({
    label,
    count: applications.length ? Math.max(1, Math.round((count / applications.length) * portfolioCount)) : count,
  }))
}
