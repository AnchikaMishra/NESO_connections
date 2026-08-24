"use client"

import { CalendarRange, Gauge, RefreshCcw, RotateCcw, TimerReset } from "lucide-react"
import {
  CAPACITY_OPTIONS,
  CAPACITY_STAGE_OPTIONS,
  DEFAULT_SYSTEM_SCENARIO_ASSUMPTIONS,
  DEMAND_OPTIONS,
  REVIEW_OPTIONS,
  REWORK_OPTIONS,
  WINDOW_OPTIONS,
  type SystemScenarioAssumptions,
} from "@/lib/simulate-data"
import { cn } from "@/lib/utils"

interface SimulateControlsProps {
  assumptions: SystemScenarioAssumptions
  onChange: (assumptions: SystemScenarioAssumptions) => void
}

export function SimulateControls({ assumptions, onChange }: SimulateControlsProps) {
  const update = <K extends keyof SystemScenarioAssumptions>(
    key: K,
    value: SystemScenarioAssumptions[K],
  ) => onChange({ ...assumptions, [key]: value })

  return (
    <section className="border-y border-simulate/25 bg-simulate-muted/25 py-4" aria-labelledby="scenario-controls-title">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-simulate" aria-hidden="true" />
            <h2 id="scenario-controls-title" className="text-sm font-semibold text-foreground">Scenario assumptions</h2>
            <span className="rounded bg-simulate-muted px-2 py-0.5 text-[0.62rem] font-bold uppercase text-simulate">
              90-day view
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">All outputs update from the visible assumptions below.</p>
        </div>

        <button
          type="button"
          onClick={() => onChange(DEFAULT_SYSTEM_SCENARIO_ASSUMPTIONS)}
          className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset scenario
        </button>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-4 px-1 md:grid-cols-2 xl:grid-cols-5">
        <ControlGroup icon={Gauge} label="Future application demand">
          <SegmentedControl
            value={assumptions.futureDemand}
            options={DEMAND_OPTIONS}
            onChange={(value) => update("futureDemand", value)}
          />
        </ControlGroup>

        <ControlGroup icon={Gauge} label="Processing capacity">
          <select
            value={assumptions.capacityStageId}
            onChange={(event) => update("capacityStageId", event.target.value)}
            aria-label="Processing capacity stage"
            className="mb-2 h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground outline-none focus:border-simulate focus:ring-2 focus:ring-simulate/15"
          >
            {CAPACITY_STAGE_OPTIONS.map((stage) => (
              <option key={stage.value} value={stage.value}>{stage.label}</option>
            ))}
          </select>
          <SegmentedControl
            value={assumptions.processingCapacity}
            options={CAPACITY_OPTIONS}
            onChange={(value) => update("processingCapacity", value)}
          />
        </ControlGroup>

        <ControlGroup icon={TimerReset} label="Internal review turnaround">
          <SegmentedControl
            value={assumptions.reviewTurnaround}
            options={REVIEW_OPTIONS}
            onChange={(value) => update("reviewTurnaround", value)}
          />
        </ControlGroup>

        <ControlGroup icon={RefreshCcw} label="Rework / clarification rate">
          <SegmentedControl
            value={assumptions.reworkRate}
            options={REWORK_OPTIONS}
            onChange={(value) => update("reworkRate", value)}
          />
        </ControlGroup>

        <ControlGroup icon={CalendarRange} label="Future application window">
          <SegmentedControl
            value={assumptions.applicationWindow}
            options={WINDOW_OPTIONS}
            onChange={(value) => update("applicationWindow", value)}
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
  icon: typeof Gauge
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

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <div className="flex min-h-8 w-full rounded-md border border-border bg-card p-0.5" role="radiogroup">
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
              "min-w-0 flex-1 rounded px-1.5 py-1 text-[0.65rem] font-semibold leading-tight transition-colors",
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
