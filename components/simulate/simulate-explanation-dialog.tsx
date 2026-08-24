"use client"

import { useState } from "react"
import { BookOpen, ChevronRight, Network, ShieldCheck } from "lucide-react"
import type { SystemScenario } from "@/lib/simulate-data"
import { stageLabel } from "@/lib/simulate-data"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface SimulateExplanationDialogProps {
  scenario: SystemScenario
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SimulateExplanationDialog({
  scenario,
  open,
  onOpenChange,
}: SimulateExplanationDialogProps) {
  const [openGuidanceReference, setOpenGuidanceReference] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="marble-workspace max-h-[88vh] max-w-3xl overflow-y-auto">
        <div className="pr-8">
          <p className="text-[0.68rem] font-bold uppercase text-simulate">Scenario explanation</p>
          <DialogTitle className="mt-1">Why did this change?</DialogTitle>
          <DialogDescription className="mt-1">
            A deterministic explanation assembled from the selected assumptions and synthetic stage outcomes.
          </DialogDescription>
        </div>

        <section className="border-y border-border py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-simulate-muted">
              <Network className="h-4 w-4 text-simulate" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Indicative system explanation</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{scenario.explanation}</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[0.68rem] font-bold uppercase text-simulate">Assumption drivers</h3>
          <div className="mt-2 divide-y divide-border border-y border-border">
            {scenario.drivers.map((driver, index) => (
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
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-[0.68rem] font-bold uppercase text-simulate">Relevant guidance</p>
              <h3 className="text-sm font-semibold text-foreground">Context retrieved for interpretation</h3>
            </div>
            <span className="text-[0.62rem] text-muted-foreground">Predefined demo references</span>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {scenario.policyRefs.map((reference) => {
              const expanded = openGuidanceReference === reference.reference
              return (
                <div key={reference.reference} className="py-3">
                  <div className="flex items-start gap-3">
                    <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-simulate" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{reference.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {reference.reference} · {reference.version} · {reference.publishedDate}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenGuidanceReference(expanded ? null : reference.reference)}
                      aria-expanded={expanded}
                      className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-simulate transition-colors hover:bg-simulate-muted"
                    >
                      View relevant section
                      <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")} aria-hidden="true" />
                    </button>
                  </div>
                  {expanded && (
                    <div className="ml-7 mt-3 border-l-2 border-simulate/30 pl-3">
                      <p className="text-xs font-semibold text-foreground">{reference.relevantSection}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{reference.relevantSectionText}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <div className="flex items-start gap-2 border border-simulate/25 bg-simulate-muted/30 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-simulate" aria-hidden="true" />
          <span>
            {scenario.confidenceNote} The orchestration explains the comparison; it does not choose assumptions or decide a response.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
          <ComparisonMetric label="Peak queue" baseline={scenario.baselinePeakQueue} scenario={scenario.peakQueue} />
          <ComparisonMetric label="Average delay" baseline={`${scenario.baselineAvgDelay}d`} scenario={`${scenario.avgDelay}d`} />
          <ComparisonMetric label="Rework" baseline={`${scenario.baselineReworkRate}%`} scenario={`${scenario.reworkRate}%`} />
          <ComparisonMetric
            label="Bottleneck"
            baseline={stageLabel(scenario.baselineBottleneckStageId)}
            scenario={stageLabel(scenario.bottleneckStageId)}
          />
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
      <dt className="text-[0.62rem] font-bold uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xs text-muted-foreground">{baseline}</dd>
      <dd className="mt-0.5 break-words text-sm font-bold text-simulate">{scenario}</dd>
    </dl>
  )
}
