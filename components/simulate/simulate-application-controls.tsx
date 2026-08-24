"use client"

import { FileCheck2, LandPlot, Link2, Play, TimerReset, UserRoundCheck } from "lucide-react"
import {
  APPLICANT_SLA_OPTIONS,
  APPLICATION_REVIEW_OPTIONS,
  DEPENDENCY_OPTIONS,
  EVIDENCE_DAY_OPTIONS,
  EVIDENCE_STATE_OPTIONS,
  type ApplicationScenarioAssumptions,
} from "@/lib/simulate-application-data"
import { cn } from "@/lib/utils"

interface SimulateApplicationControlsProps {
  assumptions: ApplicationScenarioAssumptions
  dirty: boolean
  onChange: (assumptions: ApplicationScenarioAssumptions) => void
  onRun: () => void
}

export function SimulateApplicationControls({
  assumptions,
  dirty,
  onChange,
  onRun,
}: SimulateApplicationControlsProps) {
  const update = <K extends keyof ApplicationScenarioAssumptions>(
    key: K,
    value: ApplicationScenarioAssumptions[K],
  ) => onChange({ ...assumptions, [key]: value })

  return (
    <section className="border-y border-simulate/25 bg-simulate-muted/25 py-4" aria-labelledby="application-assumptions-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <TimerReset className="h-4 w-4 text-simulate" aria-hidden="true" />
          <h2 id="application-assumptions-title" className="text-sm font-semibold text-foreground">Application scenario assumptions</h2>
          <span className="rounded bg-simulate-muted px-2 py-0.5 text-[0.62rem] font-bold uppercase text-simulate">
            Illustrative
          </span>
          {dirty && <span className="text-[0.65rem] font-semibold text-queue">Assumptions changed</span>}
        </div>
        <button
          type="button"
          onClick={onRun}
          className="flex min-h-9 items-center justify-center gap-2 rounded-md bg-simulate px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-simulate/90"
        >
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          Run scenario
        </button>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-4 px-1 md:grid-cols-2 xl:grid-cols-3">
        <ControlGroup icon={FileCheck2} label="Evidence expected in">
          <SegmentedControl
            value={assumptions.evidenceExpectedDays}
            options={EVIDENCE_DAY_OPTIONS}
            onChange={(value) => update("evidenceExpectedDays", value)}
          />
        </ControlGroup>

        <ControlGroup icon={Link2} label="Dependency resolution">
          <SegmentedControl
            value={assumptions.dependencyResolution}
            options={DEPENDENCY_OPTIONS}
            onChange={(value) => update("dependencyResolution", value)}
          />
        </ControlGroup>

        <ControlGroup icon={UserRoundCheck} label="Applicant response SLA">
          <SegmentedControl
            value={assumptions.applicantResponseSla}
            options={APPLICANT_SLA_OPTIONS}
            onChange={(value) => update("applicantResponseSla", value)}
          />
        </ControlGroup>

        <ControlGroup icon={FileCheck2} label="Planning evidence">
          <SegmentedControl
            value={assumptions.planningEvidence}
            options={EVIDENCE_STATE_OPTIONS}
            onChange={(value) => update("planningEvidence", value)}
          />
        </ControlGroup>

        <ControlGroup icon={LandPlot} label="Land-rights evidence">
          <SegmentedControl
            value={assumptions.landRightsEvidence}
            options={EVIDENCE_STATE_OPTIONS}
            onChange={(value) => update("landRightsEvidence", value)}
          />
        </ControlGroup>

        <ControlGroup icon={TimerReset} label="Internal review turnaround">
          <SegmentedControl
            value={assumptions.reviewTurnaround}
            options={APPLICATION_REVIEW_OPTIONS}
            onChange={(value) => update("reviewTurnaround", value)}
          />
        </ControlGroup>
      </div>
    </section>
  )
}

function ControlGroup({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof FileCheck2
  label: string
  children: React.ReactNode
}) {
  return (
    <fieldset className="min-w-0 border-l-2 border-simulate/20 pl-3">
      <legend className="mb-2 flex items-center gap-1.5 text-[0.66rem] font-bold uppercase text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-simulate" aria-hidden="true" />
        {label}
      </legend>
      {children}
    </fieldset>
  )
}

function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <div className="flex min-h-9 w-full rounded-md border border-border bg-card p-0.5" role="radiogroup">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-w-0 flex-1 rounded px-2 py-1 text-[0.68rem] font-semibold leading-tight transition-colors",
              active ? "bg-simulate text-white shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
