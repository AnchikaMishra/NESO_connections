"use client"

import { ArrowRight, Gauge, ShieldCheck } from "lucide-react"
import type { SystemScenario } from "@/lib/simulate-data"
import { scenarioStageOutcome, stageLabel } from "@/lib/simulate-data"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

interface SimulateStageDialogProps {
  scenario: SystemScenario
  stageId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onExplain: () => void
}

export function SimulateStageDialog({
  scenario,
  stageId,
  open,
  onOpenChange,
  onExplain,
}: SimulateStageDialogProps) {
  if (!stageId) return null
  const outcome = scenarioStageOutcome(scenario, stageId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <div className="pr-8">
          <p className="text-[0.68rem] font-bold uppercase text-simulate">Stage consequence</p>
          <DialogTitle className="mt-1">{stageLabel(stageId)}</DialogTitle>
          <DialogDescription className="mt-1">
            Illustrative 90-day baseline compared with the selected scenario.
          </DialogDescription>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3 border-y border-border py-4">
          <StageState
            label="Baseline"
            count={outcome.baselineCount}
            dwell={outcome.dwellBaseline}
            pressure={outcome.baselinePressure}
          />
          <ArrowRight className="mt-8 h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <StageState
            label="Scenario"
            count={outcome.scenarioCount}
            dwell={outcome.dwellScenario}
            pressure={outcome.scenarioPressure}
            scenario
          />
        </div>

        <section>
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-simulate" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">What changed in this scenario</h3>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {scenario.assumptionSummary.map((assumption) => (
              <span key={assumption} className="rounded bg-simulate-muted px-2 py-1 text-xs font-semibold text-simulate">
                {assumption}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{scenario.explanation}</p>
        </section>

        <div className="flex flex-col gap-3 border border-simulate/25 bg-simulate-muted/25 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-simulate" aria-hidden="true" />
            <span>Illustrative stage consequence. Human interpretation required.</span>
          </div>
          <button
            type="button"
            onClick={onExplain}
            className="min-h-9 shrink-0 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Why did this change?
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StageState({
  label,
  count,
  dwell,
  pressure,
  scenario = false,
}: {
  label: string
  count: number
  dwell: number
  pressure: number
  scenario?: boolean
}) {
  return (
    <div className={scenario ? "border-l-2 border-simulate pl-3" : "border-l-2 border-dashed border-muted-foreground/40 pl-3"}>
      <p className={scenario ? "text-xs font-bold uppercase text-simulate" : "text-xs font-bold uppercase text-muted-foreground"}>
        {label}
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        <Metric label="Queue" value={count} scenario={scenario} />
        <Metric label="Dwell" value={`${dwell}d`} scenario={scenario} />
        <Metric label="Pressure" value={`${Math.round(pressure * 100)}%`} scenario={scenario} />
      </dl>
    </div>
  )
}

function Metric({ label, value, scenario }: { label: string; value: string | number; scenario: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.58rem] font-bold uppercase text-muted-foreground">{label}</dt>
      <dd className={scenario ? "mt-1 text-base font-bold tabular-nums text-simulate" : "mt-1 text-base font-bold tabular-nums text-primary"}>
        {value}
      </dd>
    </div>
  )
}
