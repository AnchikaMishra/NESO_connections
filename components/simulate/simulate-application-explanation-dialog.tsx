"use client"

import { useEffect, useState } from "react"
import { BookOpen, ChevronRight, Network, ShieldCheck } from "lucide-react"
import type { Application } from "@/lib/applications"
import type { ApplicationScenarioOutcome } from "@/lib/simulate-application-data"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface SimulateApplicationExplanationDialogProps {
  application: Application
  outcome: ApplicationScenarioOutcome
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SimulateApplicationExplanationDialog({
  application,
  outcome,
  open,
  onOpenChange,
}: SimulateApplicationExplanationDialogProps) {
  const [guidanceOpen, setGuidanceOpen] = useState(false)

  useEffect(() => setGuidanceOpen(false), [application.id, outcome.id, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="marble-workspace max-h-[90vh] max-w-3xl overflow-y-auto">
        <div className="pr-8">
          <p className="text-[0.68rem] font-bold uppercase text-simulate">Application scenario explanation</p>
          <DialogTitle className="mt-1">Explain scenario</DialogTitle>
          <DialogDescription className="mt-1">
            {application.name} · {application.reference} · Synthetic scenario output
          </DialogDescription>
        </div>

        <section className="border-y border-border py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-simulate-muted">
              <Network className="h-4 w-4 text-simulate" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Indicative application explanation</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{outcome.explanation}</p>
            </div>
          </div>
        </section>

        <section>
          <p className="text-[0.68rem] font-bold uppercase text-simulate">Scenario drivers</p>
          <div className="mt-2 divide-y divide-border border-y border-border">
            {outcome.drivers.map((driver, index) => (
              <div key={driver.label} className="flex items-start gap-3 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-simulate-muted text-xs font-bold text-simulate">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{driver.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{driver.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="text-[0.68rem] font-bold uppercase text-simulate">Relevant guidance</p>
          <div className="mt-2 border-y border-border py-3">
            <div className="flex items-start gap-3">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-simulate" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{outcome.guidance.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {outcome.guidance.reference} · {outcome.guidance.version} · {outcome.guidance.publishedDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGuidanceOpen((current) => !current)}
                aria-expanded={guidanceOpen}
                className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-simulate transition-colors hover:bg-simulate-muted"
              >
                View relevant section
                <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", guidanceOpen && "rotate-90")} aria-hidden="true" />
              </button>
            </div>
            {guidanceOpen && (
              <div className="ml-7 mt-3 border-l-2 border-simulate/30 pl-3">
                <p className="text-xs font-semibold text-foreground">{outcome.guidance.relevantSection}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{outcome.guidance.relevantSectionText}</p>
                <p className="mt-2 text-[0.65rem] font-semibold text-simulate">Context only · Not used to determine the scenario outcome</p>
              </div>
            )}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
          <ComparisonMetric
            label="Time to next stage"
            baseline={`${outcome.baselineTimeToNextStageWeeks} weeks`}
            scenario={`${outcome.scenarioTimeToNextStageWeeks} weeks`}
          />
          <ComparisonMetric
            label="Clarification cycles"
            baseline={outcome.baselineClarificationCycles}
            scenario={outcome.scenarioClarificationCycles}
          />
          <ComparisonMetric label="Readiness" baseline={outcome.baselineReadiness} scenario={outcome.scenarioReadiness} />
          <ComparisonMetric
            label="Delay risk"
            baseline={capitalise(outcome.baselineDelayRisk)}
            scenario={capitalise(outcome.scenarioDelayRisk)}
          />
        </div>

        <div className="flex items-start gap-2 border border-simulate/25 bg-simulate-muted/30 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-simulate" aria-hidden="true" />
          <span>
            Synthetic explanation and orchestration only. The scenario helps users understand possible consequences; it does not determine a pathway or response.
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ComparisonMetric({
  label,
  baseline,
  scenario,
}: {
  label: string
  baseline: string | number
  scenario: string | number
}) {
  return (
    <dl className="min-w-0">
      <dt className="text-[0.6rem] font-bold uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xs text-muted-foreground">{baseline}</dd>
      <dd className="mt-0.5 break-words text-sm font-bold text-simulate">{scenario}</dd>
    </dl>
  )
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
