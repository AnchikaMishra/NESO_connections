"use client"

import { useMemo, useState } from "react"
import { ShieldCheck } from "lucide-react"
import {
  DEFAULT_SYSTEM_SCENARIO_ASSUMPTIONS,
  buildSystemScenario,
  type SystemScenarioAssumptions,
} from "@/lib/simulate-data"
import { SimulateControls } from "./simulate-controls"
import { SimulateSystem } from "./simulate-system"
import { SimulateApplication } from "./simulate-application"
import { SimulateLevelSwitch, type SimulateLevel } from "./simulate-level-switch"

export function SimulateDashboard() {
  const [level, setLevel] = useState<SimulateLevel>("system")
  const [assumptions, setAssumptions] = useState<SystemScenarioAssumptions>(
    DEFAULT_SYSTEM_SCENARIO_ASSUMPTIONS,
  )
  const scenario = useMemo(() => buildSystemScenario(assumptions), [assumptions])

  return (
    <>
      <SimulateLevelSwitch value={level} onChange={setLevel} />

      <section className="flex justify-end" aria-label="Scenario trust statement">
        <div className="flex max-w-3xl items-start gap-2 border-l-2 border-simulate/30 pl-3 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-simulate" aria-hidden="true" />
          <span>Scenario outputs are illustrative, not deterministic. NESO teams choose what to test and how to respond.</span>
        </div>
      </section>

      {level === "system" ? (
        <>
          <SimulateControls assumptions={assumptions} onChange={setAssumptions} />
          <SimulateSystem scenario={scenario} />
        </>
      ) : (
        <SimulateApplication systemScenario={scenario} />
      )}

      <div className="flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-simulate" aria-hidden="true" />
        <span className="italic">Synthetic, deterministic scenario outputs. No operational decision or response is made by the prototype.</span>
      </div>
    </>
  )
}
