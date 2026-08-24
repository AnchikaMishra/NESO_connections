"use client"

import { useMemo, useState } from "react"
import {
  ArrowRight,
  BookOpen,
  Building2,
  CircleGauge,
  Clock3,
  FileCheck2,
  HelpCircle,
  Layers3,
  Link2,
  ShieldCheck,
  TriangleAlert,
  Workflow,
} from "lucide-react"
import {
  APPLICATIONS,
  CONNECTION_TYPE_COLORS,
  type Application,
} from "@/lib/applications"
import { APPLICATION_RISK_META, applicationForecast } from "@/lib/predict-data"
import {
  DEFAULT_APPLICATION_SCENARIO_ASSUMPTIONS,
  applicationDependencies,
  applicationEvidenceStatus,
  buildApplicationScenario,
  cohortScenarioInsights,
  type ApplicationScenarioAssumptions,
  type ApplicationScenarioOutcome,
  type CohortScenarioInsight,
} from "@/lib/simulate-application-data"
import type { SystemScenario } from "@/lib/simulate-data"
import { STAGES } from "@/lib/track-data"
import { SimulateApplicationControls } from "./simulate-application-controls"
import { SimulateApplicationExplanationDialog } from "./simulate-application-explanation-dialog"
import { cn } from "@/lib/utils"

interface SimulateApplicationProps {
  systemScenario: SystemScenario
}

const AVAILABLE_APPLICATIONS = APPLICATIONS.filter(
  (application) => application.status !== "withdrawn" && application.status !== "rejected",
)

export function SimulateApplication({ systemScenario }: SimulateApplicationProps) {
  const [selectedApplicationId, setSelectedApplicationId] = useState("meridian-data-campus")
  const [draftAssumptions, setDraftAssumptions] = useState<ApplicationScenarioAssumptions>(
    DEFAULT_APPLICATION_SCENARIO_ASSUMPTIONS,
  )
  const [appliedAssumptions, setAppliedAssumptions] = useState<ApplicationScenarioAssumptions>(
    DEFAULT_APPLICATION_SCENARIO_ASSUMPTIONS,
  )
  const [explanationOpen, setExplanationOpen] = useState(false)
  const application =
    AVAILABLE_APPLICATIONS.find((candidate) => candidate.id === selectedApplicationId) ?? AVAILABLE_APPLICATIONS[0]
  const outcome = useMemo(
    () => buildApplicationScenario(application, appliedAssumptions),
    [application, appliedAssumptions],
  )
  const cohortInsights = useMemo(
    () => cohortScenarioInsights(systemScenario.assumptions.applicationWindow),
    [systemScenario.assumptions.applicationWindow],
  )
  const currentStage = STAGES.find((stage) => stage.id === application.stageId) ?? STAGES[0]
  const dependencies = applicationDependencies(application)
  const dirty = scenarioKey(draftAssumptions) !== scenarioKey(appliedAssumptions)

  const selectApplication = (applicationId: string) => {
    setSelectedApplicationId(applicationId)
    setDraftAssumptions(DEFAULT_APPLICATION_SCENARIO_ASSUMPTIONS)
    setAppliedAssumptions(DEFAULT_APPLICATION_SCENARIO_ASSUMPTIONS)
    setExplanationOpen(false)
  }

  return (
    <>
      <section className="border-y border-simulate/25 bg-simulate-muted/20 py-4" aria-labelledby="application-selector-title">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-simulate" aria-hidden="true" />
              <h2 id="application-selector-title" className="text-sm font-semibold text-foreground">Select application</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">What could happen to this project if assumptions change?</p>
          </div>

          <label className="w-full lg:max-w-xl">
            <span className="sr-only">Application</span>
            <select
              value={application.id}
              onChange={(event) => selectApplication(event.target.value)}
              className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm font-semibold text-foreground outline-none transition-colors focus:border-simulate focus:ring-2 focus:ring-simulate/15"
            >
              {AVAILABLE_APPLICATIONS.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} · {candidate.reference} · {candidate.descriptor}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-simulate/15 pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-2 font-semibold text-foreground">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CONNECTION_TYPE_COLORS[application.connectionType] }}
              aria-hidden="true"
            />
            {application.name}
          </span>
          <span>{application.descriptor}</span>
          <span>{application.geography}</span>
          <span>{application.cohort}</span>
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <CurrentPosition application={application} currentStageLabel={currentStage.label} dependencies={dependencies} />
        <PredictedBaseline application={application} />
      </div>

      <SimulateApplicationControls
        assumptions={draftAssumptions}
        dirty={dirty}
        onChange={setDraftAssumptions}
        onRun={() => setAppliedAssumptions({ ...draftAssumptions })}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ApplicationOutcomeMetric
          label="Time to next stage"
          baseline={`${outcome.baselineTimeToNextStageWeeks} weeks`}
          scenario={`${outcome.scenarioTimeToNextStageWeeks} weeks`}
          icon={Clock3}
        />
        <ApplicationOutcomeMetric
          label="Clarification cycles"
          baseline={outcome.baselineClarificationCycles}
          scenario={outcome.scenarioClarificationCycles}
          icon={Workflow}
        />
        <ApplicationOutcomeMetric
          label="Readiness outlook"
          baseline={outcome.baselineReadiness}
          scenario={outcome.scenarioReadiness}
          icon={FileCheck2}
        />
        <ApplicationOutcomeMetric
          label="Delay risk"
          baseline={capitalise(outcome.baselineDelayRisk)}
          scenario={capitalise(outcome.scenarioDelayRisk)}
          icon={TriangleAlert}
          risk={outcome.scenarioDelayRisk}
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ApplicationJourney
          application={application}
          outcome={outcome}
          onExplain={() => setExplanationOpen(true)}
        />
        <ApplicationScenarioRail
          outcome={outcome}
          cohortInsights={cohortInsights}
          systemScenarioName={systemScenario.name}
          onExplain={() => setExplanationOpen(true)}
        />
      </div>

      <SimulateApplicationExplanationDialog
        application={application}
        outcome={outcome}
        open={explanationOpen}
        onOpenChange={setExplanationOpen}
      />
    </>
  )
}

function CurrentPosition({
  application,
  currentStageLabel,
  dependencies,
}: {
  application: Application
  currentStageLabel: string
  dependencies: string[]
}) {
  return (
    <section className="min-w-0 rounded-lg border border-border bg-card p-5 shadow-sm">
      <p className="text-[0.68rem] font-bold uppercase text-accent">Current position</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <PositionMetric label="Current stage" value={currentStageLabel} icon={Layers3} />
        <PositionMetric label="Current dwell" value={`${application.daysInStage} days`} icon={Clock3} />
        <PositionMetric label="Evidence status" value={applicationEvidenceStatus(application)} icon={FileCheck2} />
        <PositionMetric
          label="Dependencies"
          value={dependencies[0] === "No material dependency recorded" ? "None recorded" : `${dependencies.length} recorded`}
          icon={Link2}
        />
      </div>
      <div className="mt-4 border-t border-border pt-3">
        <p className="text-[0.62rem] font-bold uppercase text-muted-foreground">Current blockers</p>
        {application.blockers.length ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {application.blockers.map((blocker) => (
              <div key={blocker.label} className="border-l-2 border-queue pl-2">
                <p className="text-xs font-semibold text-foreground">{blocker.label}</p>
                <p className="mt-0.5 text-[0.65rem] text-muted-foreground">{blocker.owner}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">No current blocker recorded.</p>
        )}
      </div>
    </section>
  )
}

function PredictedBaseline({ application }: { application: Application }) {
  const forecast = applicationForecast(application, 30)
  const riskMeta = APPLICATION_RISK_META[forecast.riskBand]
  return (
    <section className="min-w-0 rounded-lg border border-anticipate/25 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-bold uppercase text-anticipate">Predicted baseline</p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">30-day illustrative forecast</h2>
        </div>
        <span className={cn("rounded px-2 py-1 text-xs font-bold", riskMeta.className)}>{riskMeta.label} risk</span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-relaxed text-foreground">{forecast.predictedIssue}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-4">
        <PositionMetric label="Likely issue at" value={forecast.failureStage.label} icon={TriangleAlert} />
        <PositionMetric label="Illustrative risk" value={`~${Math.round(forecast.risk / 5) * 5}%`} icon={CircleGauge} />
        <PositionMetric label="Data completeness" value={`${forecast.dataCompleteness}%`} icon={FileCheck2} />
        <PositionMetric label="Forecast confidence" value={`${forecast.confidence}%`} icon={ShieldCheck} />
      </div>
    </section>
  )
}

function PositionMetric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Layers3 }) {
  return (
    <dl className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[0.6rem] font-bold uppercase text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 break-words text-xs font-semibold text-foreground">{value}</dd>
    </dl>
  )
}

function ApplicationOutcomeMetric({
  label,
  baseline,
  scenario,
  icon: Icon,
  risk,
}: {
  label: string
  baseline: string | number
  scenario: string | number
  icon: typeof Clock3
  risk?: "low" | "medium" | "high"
}) {
  return (
    <article className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.64rem] font-bold uppercase text-muted-foreground">{label}</p>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <span className="min-w-0 break-words text-sm font-semibold tabular-nums text-primary">{baseline}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className={cn("min-w-0 break-words text-sm font-bold tabular-nums", risk ? riskTextClass(risk) : "text-simulate")}>
              {scenario}
            </span>
          </div>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-simulate-muted">
          <Icon className="h-4 w-4 text-simulate" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[0.6rem] font-bold uppercase text-muted-foreground">
        <span>Baseline</span>
        <span className="text-simulate">Scenario</span>
      </div>
    </article>
  )
}

function ApplicationJourney({
  application,
  outcome,
  onExplain,
}: {
  application: Application
  outcome: ApplicationScenarioOutcome
  onExplain: () => void
}) {
  return (
    <section className="min-w-0 rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-bold uppercase text-simulate">Application marble journey</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">Current trajectory vs scenario trajectory</h2>
        </div>
        <button
          type="button"
          onClick={onExplain}
          className="flex min-h-9 items-center justify-center gap-2 rounded-md border border-simulate/35 px-3 text-xs font-semibold text-simulate transition-colors hover:bg-simulate-muted"
        >
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
          Explain scenario
        </button>
      </div>

      <div className="marble-workspace mt-4 overflow-x-auto border-y border-border py-4">
        <div className="min-w-[720px] space-y-5">
          <JourneyLane
            label="Current trajectory"
            steps={outcome.currentTrajectory}
            colour={CONNECTION_TYPE_COLORS[application.connectionType]}
          />
          <JourneyLane
            label="Scenario trajectory"
            steps={outcome.scenarioTrajectory}
            colour="var(--simulate)"
            scenario
          />
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 border-l-2 border-simulate pl-3">
        <Workflow className="mt-0.5 h-4 w-4 shrink-0 text-simulate" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-muted-foreground">{outcome.explanation}</p>
      </div>
    </section>
  )
}

function JourneyLane({
  label,
  steps,
  colour,
  scenario = false,
}: {
  label: string
  steps: string[]
  colour: string
  scenario?: boolean
}) {
  return (
    <div className="grid grid-cols-[130px_minmax(0,1fr)] items-center gap-3">
      <div>
        <p className={cn("text-[0.66rem] font-bold uppercase", scenario ? "text-simulate" : "text-muted-foreground")}>{label}</p>
        <p className="mt-1 text-[0.62rem] text-muted-foreground">{scenario ? "Indicative outcome" : "Predicted baseline"}</p>
      </div>
      <div className="flex items-center">
        {steps.map((step, index) => (
          <div key={`${step}-${index}`} className="contents">
            <div
              className={cn(
                "relative flex h-[64px] w-[150px] shrink-0 items-center border px-3 text-xs font-semibold leading-snug",
                scenario
                  ? "rounded-md border-simulate/45 bg-simulate-muted/35 text-foreground"
                  : "rounded-md border-dashed border-muted-foreground/45 bg-secondary/40 text-muted-foreground",
              )}
            >
              <span className="mr-2 h-3 w-3 shrink-0 rounded-full ring-4 ring-background" style={{ backgroundColor: colour }} aria-hidden="true" />
              <span>{step}</span>
            </div>
            {index < steps.length - 1 && (
              <div className="flex w-10 shrink-0 items-center" aria-hidden="true">
                <span className={cn("h-0 flex-1 border-t-2", scenario ? "border-simulate" : "border-dashed border-muted-foreground/45")} />
                <span className={cn("-ml-1 h-2 w-2 rotate-45 border-r-2 border-t-2", scenario ? "border-simulate" : "border-muted-foreground/45")} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ApplicationScenarioRail({
  outcome,
  cohortInsights,
  systemScenarioName,
  onExplain,
}: {
  outcome: ApplicationScenarioOutcome
  cohortInsights: CohortScenarioInsight[]
  systemScenarioName: string
  onExplain: () => void
}) {
  return (
    <aside className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-5 shadow-sm">
      <section>
        <p className="text-[0.68rem] font-bold uppercase text-simulate">Cohort context</p>
        <h2 className="mt-1 text-sm font-semibold text-foreground">Under {systemScenarioName}</h2>
        <div className="mt-3 divide-y divide-border border-y border-border">
          {cohortInsights.map((insight) => (
            <div key={insight.cohort} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-foreground">{insight.cohort}</p>
                <span className={cn("rounded px-2 py-0.5 text-[0.62rem] font-bold", pressureClass(insight.pressure))}>
                  {insight.pressure}
                </span>
              </div>
              <p className="mt-1 text-[0.65rem] font-semibold text-muted-foreground">{insight.stage}</p>
              <p className="mt-1 text-[0.65rem] leading-relaxed text-muted-foreground">{insight.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <p className="text-[0.68rem] font-bold uppercase text-simulate">Relevant guidance</p>
        <div className="mt-2 flex items-start gap-3 border-y border-border py-3">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-simulate" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">{outcome.guidance.title}</p>
            <p className="mt-1 text-[0.65rem] text-muted-foreground">
              {outcome.guidance.version} · {outcome.guidance.publishedDate}
            </p>
            <button type="button" onClick={onExplain} className="mt-2 text-xs font-semibold text-simulate hover:underline">
              View relevant section
            </button>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <p className="text-[0.68rem] font-bold uppercase text-simulate">Trust & assurance</p>
        <dl className="mt-2 divide-y divide-border border-y border-border">
          <AssuranceRow label="Scenario assumptions" value="Visible" tone="simulate" />
          <AssuranceRow label="Synthetic model" value="Illustrative" tone="anticipate" />
          <AssuranceRow label="Policy context" value="Available" tone="success" />
          <AssuranceRow label="Scenario confidence" value={outcome.scenarioConfidence} tone="queue" />
          <AssuranceRow label="Human review" value="Required" tone="danger" />
        </dl>
        <button
          type="button"
          onClick={onExplain}
          className="mt-3 flex min-h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
          Explain scenario
        </button>
      </section>

      <div className="mt-auto pt-5">
        <div className="flex items-start gap-2 border border-simulate/25 bg-simulate-muted/25 p-3 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-simulate" aria-hidden="true" />
          <span>Scenario outputs help users understand possible consequences; they are not deterministic forecasts.</span>
        </div>
      </div>
    </aside>
  )
}

function AssuranceRow({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "simulate" | "anticipate" | "success" | "queue" | "danger"
}) {
  const dotClass = {
    simulate: "bg-simulate",
    anticipate: "bg-anticipate",
    success: "bg-success",
    queue: "bg-queue",
    danger: "bg-danger",
  }[tone]
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={cn("h-2 w-2 rounded-full", dotClass)} aria-hidden="true" />
        {label}
      </dt>
      <dd className="text-xs font-semibold text-foreground">{value}</dd>
    </div>
  )
}

function pressureClass(pressure: "Low" | "Medium" | "High"): string {
  if (pressure === "High") return "bg-danger-muted text-danger"
  if (pressure === "Medium") return "bg-queue-muted text-queue"
  return "bg-success-muted text-success"
}

function riskTextClass(risk: "low" | "medium" | "high"): string {
  if (risk === "high") return "text-danger"
  if (risk === "medium") return "text-queue"
  return "text-success"
}

function scenarioKey(assumptions: ApplicationScenarioAssumptions): string {
  return Object.values(assumptions).join("|")
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
