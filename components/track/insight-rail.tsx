"use client"

import { ArrowRight, Building2, List, Search, ShieldCheck, Users } from "lucide-react"
import { STATUS_META, type Application } from "@/lib/applications"
import { BOTTLENECK_STAGE_ID, STAGES, TRUST_NOTE } from "@/lib/track-data"
import { TONE_BADGE } from "@/lib/track-ui"
import { cn } from "@/lib/utils"

interface InsightRailProps {
  bottleneckCount: number
  applications: Application[]
  onOpenBottleneck: () => void
  onOpenApplication: (application: Application) => void
  onViewAll: () => void
  horizontal?: boolean
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

export function InsightRail({
  bottleneckCount,
  applications,
  onOpenBottleneck,
  onOpenApplication,
  onViewAll,
  horizontal,
}: InsightRailProps) {
  const bottleneck = STAGES.find((stage) => stage.id === BOTTLENECK_STAGE_ID)!
  const attentionApplications = [...applications]
    .sort((a, b) => attentionOrder[a.status] - attentionOrder[b.status] || b.daysInStage - a.daysInStage)
    .slice(0, 3)

  return (
    <aside aria-label="Current system and application attention" className={cn("flex min-w-0 max-w-full flex-col gap-5", horizontal && "grid grid-cols-1 lg:grid-cols-2")}>
      <section className="rounded-lg border border-danger/25 bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-danger/10">
            <Search className="h-4 w-4 text-danger" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[0.68rem] font-bold uppercase text-accent">Marble Run Insight</p>
            <h2 className="text-base font-semibold text-foreground">{bottleneck.label}</h2>
          </div>
        </div>

        <div className="border-l-2 border-danger pl-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-danger">{bottleneckCount} applications currently here</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Elevated current dwell, clarification and design rework are visible at this stage.</p>
        </div>

        <button
          type="button"
          onClick={onOpenBottleneck}
          className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Investigate stage
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10">
            <Building2 className="h-4 w-4 text-accent" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[0.68rem] font-bold uppercase text-accent">Application Insight</p>
            <h2 className="text-base font-semibold text-foreground">Current observed issues</h2>
          </div>
        </div>

        {attentionApplications.length ? (
          <div className="divide-y divide-border">
            {attentionApplications.map((application) => {
              const status = STATUS_META[application.status]
              return (
                <button
                  key={application.id}
                  type="button"
                  onClick={() => onOpenApplication(application)}
                  className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:text-primary"
                >
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{application.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      <span className="font-mono font-semibold">{application.reference}</span> · {application.descriptor}
                    </span>
                    <span className="block truncate text-[0.68rem] text-muted-foreground">
                      {application.daysInStage} days in stage · {application.blockers.length} current blocker{application.blockers.length === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className={cn("rounded px-1.5 py-0.5 text-[0.65rem] font-semibold", TONE_BADGE[status.tone])}>{status.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              )
            })}
          </div>
        ) : (
          <p className="border-y border-border py-4 text-sm text-muted-foreground">No detailed examples match the current filters and focus.</p>
        )}

        <button
          type="button"
          onClick={onViewAll}
          className="mt-3 flex h-8 w-full items-center justify-center gap-2 rounded-md border border-border text-xs font-semibold text-primary transition-colors hover:bg-secondary"
        >
          <List className="h-3.5 w-3.5" aria-hidden="true" />
          View all applications
        </button>
      </section>

      <div className={cn("flex items-start gap-3 border-t border-border pt-4", horizontal && "lg:col-span-2")}>
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-muted-foreground">{TRUST_NOTE}</p>
      </div>
    </aside>
  )
}
