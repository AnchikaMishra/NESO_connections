"use client"

import { useEffect, useState } from "react"
import {
  BookOpen,
  CalendarClock,
  ChevronDown,
  CircleGauge,
  Database,
  FileSearch,
  HelpCircle,
  ShieldCheck,
  TriangleAlert,
  UserCheck,
} from "lucide-react"
import { STAGES } from "@/lib/track-data"
import { applicationOwner, type Application } from "@/lib/applications"
import {
  APPLICATION_RISK_META,
  applicationForecast,
  type DriverContribution,
  type ForecastHorizon,
} from "@/lib/predict-data"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface PredictApplicationDialogProps {
  application: Application | null
  horizon: ForecastHorizon
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PredictApplicationDialog({
  application,
  horizon,
  open,
  onOpenChange,
}: PredictApplicationDialogProps) {
  const [modelExplanationOpen, setModelExplanationOpen] = useState(false)
  const [guidanceOpen, setGuidanceOpen] = useState(false)
  const [agentExplanationOpen, setAgentExplanationOpen] = useState(false)

  useEffect(() => {
    setModelExplanationOpen(false)
    setGuidanceOpen(false)
    setAgentExplanationOpen(false)
  }, [application?.id, horizon, open])

  if (!application) return null

  const forecast = applicationForecast(application, horizon)
  const currentStage = STAGES.find((stage) => stage.id === application.stageId) ?? STAGES[0]
  const owner = applicationOwner(application)
  const riskMeta = APPLICATION_RISK_META[forecast.riskBand]
  const investigateApplication = () => {
    setModelExplanationOpen(true)
    setGuidanceOpen(true)
    setAgentExplanationOpen(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-anticipate-muted">
              <CalendarClock className="h-5 w-5 text-anticipate" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.68rem] font-bold uppercase text-anticipate">Application Forecast</p>
              <DialogTitle>{application.name}</DialogTitle>
              <DialogDescription className="mt-1">
                <span className="font-mono font-semibold">{application.reference}</span> | {application.descriptor} | {application.region}
              </DialogDescription>
              <p className="mt-1 text-[0.65rem] font-semibold text-muted-foreground">Illustrative synthetic prediction</p>
            </div>
          </div>
          <span className={cn("w-fit rounded px-2.5 py-1.5 text-sm font-bold", riskMeta.className)}>
            {riskMeta.label} risk | ~{approximatePercent(forecast.risk)}% illustrative likelihood
          </span>
        </div>

        <section className="grid border-y border-border md:grid-cols-2">
          <div className="py-4 pr-0 md:pr-5">
            <p className="text-[0.68rem] font-bold uppercase text-accent">Current Position</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">{currentStage.label}</h3>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span><strong className="text-foreground">{application.daysInStage}</strong> days in stage</span>
              <span><strong className="text-foreground">{application.targetDays}</strong> day target</span>
              <span>Owner: <strong className="text-foreground">{owner}</strong></span>
            </div>
            <div className="mt-4">
              <p className="text-[0.62rem] font-bold uppercase text-muted-foreground">Current blockers</p>
              {application.blockers.length ? (
                <ul className="mt-2 space-y-2">
                  {application.blockers.slice(0, 3).map((blocker) => (
                    <li key={blocker.label} className="border-l-2 border-danger/40 pl-2.5">
                      <p className="text-xs font-semibold text-foreground">{blocker.label}</p>
                      <p className="mt-0.5 text-[0.68rem] leading-relaxed text-muted-foreground">{blocker.detail}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">No current blockers are recorded.</p>
              )}
            </div>
          </div>

          <div className="border-t border-border py-4 md:border-l md:border-t-0 md:pl-5">
            <p className="text-[0.68rem] font-bold uppercase text-anticipate">Likely Next Issue</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">{forecast.failureStage.label}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{forecast.predictedIssue}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <CompactMetric label="Forecast horizon" value={`${horizon} days`} />
              <CompactMetric label="Illustrative likelihood" value={`~${approximatePercent(forecast.probability)}%`} />
              <CompactMetric label="Risk band" value={riskMeta.label} />
              <CompactMetric
                label="Time to threshold"
                value={forecast.daysToThreshold === null ? "Not forecast" : forecast.daysToThreshold === 0 ? "Reached" : `${forecast.daysToThreshold} days`}
              />
            </dl>
          </div>
        </section>

        <section>
          <button
            type="button"
            onClick={() => setModelExplanationOpen((current) => !current)}
            aria-expanded={modelExplanationOpen}
            className="flex w-full items-center justify-between gap-3 border-y border-border py-3 text-left transition-colors hover:bg-secondary/40"
          >
            <span className="flex items-center gap-2.5">
              <HelpCircle className="h-4 w-4 text-anticipate" aria-hidden="true" />
              <span>
                <span className="block text-[0.68rem] font-bold uppercase text-anticipate">Illustrative model explanation</span>
                <span className="mt-0.5 block text-sm font-semibold text-foreground">Why this prediction?</span>
              </span>
            </span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", modelExplanationOpen && "rotate-180")} aria-hidden="true" />
          </button>

          {modelExplanationOpen && (
            <div className="border-b border-border py-4">
              <p className="text-xs text-muted-foreground">Ranked from deterministic case and flow signals.</p>
              <ol className="mt-3 divide-y divide-border border-y border-border">
                {forecast.drivers.map((driver, index) => (
                  <li key={driver.label} className="flex items-start gap-3 py-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-queue-muted text-xs font-bold text-queue">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{driver.label}</h3>
                        <span className={cn("rounded px-2 py-0.5 text-[0.6rem] font-bold uppercase", contributionClass(driver.contribution))}>
                          {driver.contribution} contribution
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{driver.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-2.5">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <div>
                <p className="text-[0.68rem] font-bold uppercase text-accent">Relevant Guidance</p>
                <h3 className="mt-1 text-sm font-semibold text-foreground">{forecast.guidance.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {forecast.guidance.version} | {forecast.guidance.publishedDate} | {forecast.guidance.reference}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Relevant topic: {forecast.guidance.topic}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGuidanceOpen((current) => !current)}
              aria-expanded={guidanceOpen}
              className="flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold text-primary transition-colors hover:bg-secondary"
            >
              <FileSearch className="h-3.5 w-3.5" aria-hidden="true" />
              View relevant section
            </button>
          </div>
          {guidanceOpen && (
            <div className="mt-3 border-y border-border py-3">
              <p className="text-xs font-semibold text-foreground">{forecast.guidance.relevantSection}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{forecast.guidance.relevantSectionText}</p>
              <p className="mt-2 text-[0.62rem] font-semibold text-muted-foreground">Prototype source context; it does not create the prediction.</p>
            </div>
          )}
        </section>

        <section className="border-y border-border py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[0.68rem] font-bold uppercase text-anticipate">Explanation</p>
              <h3 className="mt-1 text-sm font-semibold text-foreground">Clear AI explanation</h3>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                Pre-generated from the case record, prediction, model drivers and relevant guidance.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAgentExplanationOpen((current) => !current)}
              aria-expanded={agentExplanationOpen}
              className="flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <FileSearch className="h-3.5 w-3.5" aria-hidden="true" />
              Explain this risk
            </button>
          </div>

          {agentExplanationOpen && (
            <div className="mt-3 border-l-2 border-anticipate bg-anticipate-muted/25 py-3 pl-4 pr-3" aria-live="polite">
              <p className="text-[0.65rem] font-bold uppercase text-anticipate">Deterministic explanation</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">{forecast.agentExplanation}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[0.62rem] text-muted-foreground">
                <span className="font-semibold">Generated from:</span>
                {forecast.explanationSources.map((source) => (
                  <span key={source} className="rounded bg-card px-1.5 py-0.5 font-semibold">{source}</span>
                ))}
              </div>
            </div>
          )}
        </section>

        <section>
          <p className="text-[0.68rem] font-bold uppercase text-accent">Forecast Assurance</p>
          <h3 className="mt-1 text-sm font-semibold text-foreground">Evidence and review</h3>
          <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 border-y border-border py-4 md:grid-cols-4">
            <AssuranceItem icon={CircleGauge} label="Illustrative confidence" value={`${forecast.confidence}%`} />
            <AssuranceItem icon={Database} label="Data completeness" value={`${forecast.dataCompleteness}%`} />
            <AssuranceItem icon={BookOpen} label="Evidence / source" value="Guidance available" />
            <AssuranceItem icon={UserCheck} label="Human review" value="Required" />
          </div>
        </section>

        <div className="flex flex-col gap-3 border border-anticipate/25 bg-anticipate-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-anticipate" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold text-foreground">AI insight, human decision.</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                The AI has surfaced the emerging issue and explained why. It has not decided what NESO should do.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={investigateApplication}
            className="flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-md border border-anticipate/35 bg-card px-3 text-xs font-semibold text-primary transition-colors hover:bg-secondary"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Investigate application
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function contributionClass(contribution: DriverContribution) {
  if (contribution === "high") return "bg-danger-muted text-danger"
  if (contribution === "medium") return "bg-anticipate-muted text-anticipate"
  return "bg-success-muted text-success"
}

function approximatePercent(value: number) {
  return Math.round(value / 5) * 5
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.6rem] font-semibold uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xs font-bold text-primary">{value}</dd>
    </div>
  )
}

function AssuranceItem({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 text-xs font-semibold text-foreground">{value}</dd>
    </div>
  )
}
