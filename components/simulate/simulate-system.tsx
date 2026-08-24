"use client"

import { useMemo, useState } from "react"
import {
  ArrowRight,
  BookOpen,
  Gauge,
  HelpCircle,
  Network,
  Pause,
  Play,
  RefreshCcw,
  ShieldCheck,
  Timer,
} from "lucide-react"
import { DEFAULT_APPLICATION_FILTERS } from "@/lib/applications"
import {
  baselineStageCounts,
  scenarioStageCounts,
  scenarioStagePressures,
  stageLabel,
  type SystemScenario,
} from "@/lib/simulate-data"
import { PipelineFlow } from "@/components/track/pipeline-flow"
import { SimulateExplanationDialog } from "./simulate-explanation-dialog"
import { SimulateStageDialog } from "./simulate-stage-dialog"
import { cn } from "@/lib/utils"

interface SimulateSystemProps {
  scenario: SystemScenario
}

const ignoreDiagnostics = () => undefined

export function SimulateSystem({ scenario }: SimulateSystemProps) {
  const [playing, setPlaying] = useState(true)
  const [explanationOpen, setExplanationOpen] = useState(false)
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null)
  const baselineCounts = useMemo(() => baselineStageCounts(scenario), [scenario])
  const scenarioCounts = useMemo(() => scenarioStageCounts(scenario), [scenario])
  const scenarioPressures = useMemo(() => scenarioStagePressures(scenario), [scenario])

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ScenarioInsight
          label="Future bottleneck"
          baseline={stageLabel(scenario.baselineBottleneckStageId)}
          scenario={stageLabel(scenario.bottleneckStageId)}
          icon={Network}
        />
        <ScenarioInsight
          label="Peak queue"
          baseline={scenario.baselinePeakQueue}
          scenario={scenario.peakQueue}
          icon={Gauge}
        />
        <ScenarioInsight
          label="Average delay"
          baseline={`${scenario.baselineAvgDelay}d`}
          scenario={`${scenario.avgDelay}d`}
          icon={Timer}
        />
        <ScenarioInsight
          label="Rework"
          baseline={`${scenario.baselineReworkRate}%`}
          scenario={`${scenario.reworkRate}%`}
          icon={RefreshCcw}
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section
          aria-label="Connections system scenario"
          className="flex min-w-0 max-w-full flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[0.68rem] font-bold uppercase text-simulate">
                <span className={cn("h-2 w-2 rounded-full", playing ? "animate-pulse bg-simulate" : "bg-muted-foreground")} />
                {playing ? "Scenario flow running" : "Scenario flow paused"}
              </div>
              <h2 className="text-lg font-semibold text-foreground">Scenario Marble Run</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Illustrative 90-day baseline alongside the user-defined scenario.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPlaying((current) => !current)}
              aria-label={playing ? "Pause scenario animation" : "Resume scenario animation"}
              title={playing ? "Pause scenario animation" : "Resume scenario animation"}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-primary transition-colors hover:bg-secondary"
            >
              {playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>

          <div className="marble-workspace max-h-[560px] overflow-auto border-y border-border py-2 pr-1">
            <div className="w-fit min-w-full">
              <div className="mx-auto w-fit">
                <PipelineFlow
                  mode="complex"
                  playing={playing}
                  bottleneckId={scenario.bottleneckStageId}
                  bottleneckLabel="Scenario"
                  onSelectStage={setSelectedStageId}
                  focusId={null}
                  onDiagnostics={ignoreDiagnostics}
                  filters={DEFAULT_APPLICATION_FILTERS}
                  focusLens="all"
                  filterScale={1}
                  month={3}
                  stageCounts={scenarioCounts}
                  baselineStageCounts={baselineCounts}
                  stagePressures={scenarioPressures}
                  forecastView
                  comparisonBaselineLabel="Baseline"
                  comparisonOutcomeLabel="Scenario"
                  comparisonLegendLabel="Scenario / illustrative"
                  comparisonTone="simulate"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[0.68rem] font-bold uppercase text-simulate">Indicative flow consequence</p>
              <h3 className="text-sm font-semibold text-foreground">
                Pressure cohort: {scenario.affectedCohort}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[0.68rem] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-4 rounded border border-dashed border-muted-foreground/50 bg-secondary/50" aria-hidden="true" />
                Baseline
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-4 rounded border border-simulate bg-simulate-muted" aria-hidden="true" />
                Scenario
              </span>
            </div>
          </div>
        </section>

        <ScenarioRail scenario={scenario} onExplain={() => setExplanationOpen(true)} />
      </div>

      <SimulateExplanationDialog
        scenario={scenario}
        open={explanationOpen}
        onOpenChange={setExplanationOpen}
      />
      <SimulateStageDialog
        scenario={scenario}
        stageId={selectedStageId}
        open={selectedStageId !== null}
        onOpenChange={(open) => !open && setSelectedStageId(null)}
        onExplain={() => {
          setSelectedStageId(null)
          setExplanationOpen(true)
        }}
      />
    </>
  )
}

function ScenarioInsight({
  label,
  baseline,
  scenario,
  icon: Icon,
}: {
  label: string
  baseline: string | number
  scenario: string | number
  icon: typeof Network
}) {
  return (
    <article className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.64rem] font-bold uppercase text-muted-foreground">{label}</p>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <span className="min-w-0 truncate text-sm font-semibold tabular-nums text-primary" title={String(baseline)}>{baseline}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 break-words text-sm font-bold tabular-nums text-simulate" title={String(scenario)}>{scenario}</span>
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

function ScenarioRail({ scenario, onExplain }: { scenario: SystemScenario; onExplain: () => void }) {
  const guidance = scenario.policyRefs[0]
  return (
    <aside className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-5 shadow-sm">
      <section>
        <p className="text-[0.68rem] font-bold uppercase text-simulate">Scenario summary</p>
        <h2 className="mt-2 text-lg font-semibold text-foreground">{scenario.name}</h2>
        <div className="mt-3 space-y-2 border-y border-border py-3">
          {scenario.assumptionSummary.map((assumption) => (
            <div key={assumption} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-simulate" aria-hidden="true" />
              <span>{assumption}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <p className="text-[0.68rem] font-bold uppercase text-simulate">Indicative system effect</p>
        <div className="mt-2 divide-y divide-border border-y border-border">
          <RailMetric label="Peak queue" baseline={scenario.baselinePeakQueue} scenario={scenario.peakQueue} />
          <RailMetric label="Average delay" baseline={`${scenario.baselineAvgDelay}d`} scenario={`${scenario.avgDelay}d`} />
          <RailMetric
            label="Future bottleneck"
            baseline={stageLabel(scenario.baselineBottleneckStageId)}
            scenario={stageLabel(scenario.bottleneckStageId)}
          />
          <RailMetric label="Fallout" baseline={`${scenario.baselineFalloutRate}%`} scenario={`${scenario.falloutRate}%`} />
        </div>
        <button
          type="button"
          onClick={onExplain}
          className="mt-3 flex min-h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
          Why did this change?
        </button>
      </section>

      <section className="mt-5">
        <p className="text-[0.68rem] font-bold uppercase text-simulate">Relevant guidance</p>
        <div className="mt-2 flex items-start gap-3 border-y border-border py-3">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-simulate" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">{guidance.title}</p>
            <p className="mt-1 text-[0.65rem] text-muted-foreground">
              {guidance.version} · {guidance.publishedDate}
            </p>
            <button type="button" onClick={onExplain} className="mt-2 text-xs font-semibold text-simulate hover:underline">
              View relevant section
            </button>
          </div>
        </div>
      </section>

      <section className="mt-auto pt-5">
        <div className="border border-simulate/25 bg-simulate-muted/25 p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-simulate" aria-hidden="true" />
            <p className="text-[0.68rem] font-bold uppercase text-simulate">Assurance</p>
          </div>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>Illustrative scenario</li>
            <li>Assumptions visible</li>
            <li>Human interpretation required</li>
          </ul>
        </div>
      </section>
    </aside>
  )
}

function RailMetric({
  label,
  baseline,
  scenario,
}: {
  label: string
  baseline: string | number
  scenario: string | number
}) {
  return (
    <div className="py-3">
      <p className="text-[0.62rem] font-bold uppercase text-muted-foreground">{label}</p>
      <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <span className="min-w-0 break-words text-xs font-semibold text-primary">{baseline}</span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 break-words text-xs font-bold text-simulate">{scenario}</span>
      </div>
    </div>
  )
}
