import { STAGES } from "./track-data"

export type FutureDemandAssumption = "baseline" | "plus-10" | "plus-25" | "plus-50"
export type CapacityAssumption = "current" | "plus-10" | "plus-25"
export type ReviewAssumption = "current" | "faster"
export type ReworkAssumption = "current" | "lower"
export type WindowAssumption = "baseline" | "high-demand"

export interface SystemScenarioAssumptions {
  futureDemand: FutureDemandAssumption
  capacityStageId: string
  processingCapacity: CapacityAssumption
  reviewTurnaround: ReviewAssumption
  reworkRate: ReworkAssumption
  applicationWindow: WindowAssumption
}

export interface StageScenarioOutcome {
  stageId: string
  baselineCount: number
  scenarioCount: number
  baselinePressure: number
  scenarioPressure: number
  dwellBaseline: number
  dwellScenario: number
}

export interface ScenarioGuidance {
  title: string
  reference: string
  version: string
  publishedDate: string
  relevantSection: string
  relevantSectionText: string
}

export interface ScenarioDriver {
  label: string
  detail: string
}

export interface SystemScenario {
  id: string
  name: string
  assumptions: SystemScenarioAssumptions
  assumptionSummary: string[]
  horizonDays: 90
  stageOutcomes: StageScenarioOutcome[]
  baselinePeakQueue: number
  peakQueue: number
  baselineAvgDelay: number
  avgDelay: number
  baselineReworkRate: number
  reworkRate: number
  baselineFalloutRate: number
  falloutRate: number
  baselineBottleneckStageId: string
  bottleneckStageId: string
  affectedCohort: string
  drivers: ScenarioDriver[]
  explanation: string
  confidenceNote: string
  policyRefs: ScenarioGuidance[]
}

export const DEMAND_OPTIONS: Array<{ value: FutureDemandAssumption; label: string }> = [
  { value: "baseline", label: "Baseline" },
  { value: "plus-10", label: "+10%" },
  { value: "plus-25", label: "+25%" },
  { value: "plus-50", label: "+50%" },
]

export const CAPACITY_OPTIONS: Array<{ value: CapacityAssumption; label: string }> = [
  { value: "current", label: "Current" },
  { value: "plus-10", label: "+10%" },
  { value: "plus-25", label: "+25%" },
]

export const REVIEW_OPTIONS: Array<{ value: ReviewAssumption; label: string }> = [
  { value: "current", label: "Current" },
  { value: "faster", label: "Faster" },
]

export const REWORK_OPTIONS: Array<{ value: ReworkAssumption; label: string }> = [
  { value: "current", label: "Current" },
  { value: "lower", label: "Lower" },
]

export const WINDOW_OPTIONS: Array<{ value: WindowAssumption; label: string }> = [
  { value: "baseline", label: "Baseline" },
  { value: "high-demand", label: "High demand window" },
]

export const CAPACITY_STAGE_OPTIONS = [
  { value: "gate2-readiness", label: "Gate 2 Readiness Checks" },
  { value: "system-design", label: "System Design" },
  { value: "to-design", label: "TO Design" },
  { value: "offer-issued", label: "Issue Offers" },
] as const

export const DEFAULT_SYSTEM_SCENARIO_ASSUMPTIONS: SystemScenarioAssumptions = {
  futureDemand: "baseline",
  capacityStageId: "offer-issued",
  processingCapacity: "plus-25",
  reviewTurnaround: "current",
  reworkRate: "current",
  applicationWindow: "high-demand",
}

const BASELINE_COUNTS = [154, 139, 113, 103, 101, 89, 91, 76, 45, 41, 36]
const BASELINE_DWELL = [14, 21, 19, 14, 18, 35, 44, 42, 24, 30, 8]
const BASELINE_PRESSURES: Record<string, number> = {
  "strategic-alignment": 0.55,
  "gate2-readiness": 0.78,
  "system-design": 0.72,
  "to-design": 0.82,
  "offer-issued": 0.96,
}
const BOTTLENECK_CANDIDATES = new Set(["gate2-readiness", "system-design", "to-design", "offer-issued"])
const REVIEW_STAGES = new Set(["gate2-readiness", "strategic-alignment", "system-design", "to-design", "offer-issued"])
const REWORK_STAGES = new Set(["gate2-readiness", "system-design", "to-design", "offer-issued"])
const WINDOW_EFFECTS: Record<string, number> = {
  "gate2-readiness": 7,
  "strategic-alignment": 6,
  "system-design": 3,
  "offer-issued": 10,
}

const DEMAND_PERCENT: Record<FutureDemandAssumption, number> = {
  baseline: 0,
  "plus-10": 10,
  "plus-25": 25,
  "plus-50": 50,
}

const CAPACITY_PERCENT: Record<CapacityAssumption, number> = {
  current: 0,
  "plus-10": 10,
  "plus-25": 25,
}

const GUIDANCE: ScenarioGuidance[] = [
  {
    title: "Connections scenario modelling methodology",
    reference: "Illustrative method SIM-01",
    version: "Demo v1.0",
    publishedDate: "18 July 2026",
    relevantSection: "Interpreting capacity and queue assumptions",
    relevantSectionText:
      "Scenario outputs should be read as directional comparisons against a stated baseline. They do not represent a commitment, operational instruction or guaranteed outcome.",
  },
  {
    title: "Gate 2 readiness evidence framework",
    reference: "Illustrative guidance G2-04",
    version: "Demo v2.1",
    publishedDate: "30 June 2026",
    relevantSection: "Future application windows",
    relevantSectionText:
      "Readiness evidence, review sequencing and application-window assumptions should remain visible when interpreting future queue pressure.",
  },
]

export function buildSystemScenario(assumptions: SystemScenarioAssumptions): SystemScenario {
  const demandPercent = DEMAND_PERCENT[assumptions.futureDemand]
  const capacityPercent = CAPACITY_PERCENT[assumptions.processingCapacity]
  const capacityStageIndex = STAGES.findIndex((stage) => stage.id === assumptions.capacityStageId)

  const stageOutcomes = STAGES.map((stage, index): StageScenarioOutcome => {
    const baselineCount = BASELINE_COUNTS[index]
    const progressWeight = Math.max(0.22, 0.58 - index * 0.02)
    const demandEffect = Math.round(baselineCount * (demandPercent / 100) * progressWeight)
    const windowEffect = assumptions.applicationWindow === "high-demand" ? (WINDOW_EFFECTS[stage.id] ?? 0) : 0
    const capacityQueueEffect =
      index === capacityStageIndex ? -Math.round(baselineCount * (capacityPercent / 100) * 1.1) : 0
    const downstreamThroughputEffect =
      index === capacityStageIndex + 1 ? Math.round(capacityPercent * 0.12) : 0
    const reviewEffect = assumptions.reviewTurnaround === "faster" && REVIEW_STAGES.has(stage.id) ? -4 : 0
    const reworkEffect = assumptions.reworkRate === "lower" && REWORK_STAGES.has(stage.id) ? -3 : 0
    const scenarioCount = Math.max(
      0,
      baselineCount + demandEffect + windowEffect + capacityQueueEffect + downstreamThroughputEffect + reviewEffect + reworkEffect,
    )
    const baselinePressure = BASELINE_PRESSURES[stage.id] ?? (stage.kind === "energised" ? 0.08 : 0.22)
    const countPressure = ((scenarioCount - baselineCount) / Math.max(1, baselineCount)) * 0.45
    const windowPressure =
      assumptions.applicationWindow === "high-demand"
        ? stage.id === "gate2-readiness"
          ? 0.13
          : stage.id === "offer-issued"
            ? 0.1
            : stage.id === "system-design"
              ? 0.06
              : 0
        : 0
    const capacityRelief = index === capacityStageIndex ? (capacityPercent / 100) * 0.8 : 0
    const reviewRelief = assumptions.reviewTurnaround === "faster" && REVIEW_STAGES.has(stage.id) ? 0.1 : 0
    const reworkRelief = assumptions.reworkRate === "lower" && REWORK_STAGES.has(stage.id) ? 0.08 : 0
    const scenarioPressure = clamp(
      baselinePressure + countPressure + windowPressure - capacityRelief - reviewRelief - reworkRelief,
      0.05,
      1,
    )
    const dwellBaseline = BASELINE_DWELL[index]
    const dwellScenario = Math.max(
      4,
      dwellBaseline +
        Math.round((scenarioCount - baselineCount) * 0.45) -
        (index === capacityStageIndex ? Math.round(capacityPercent * 0.08) : 0),
    )

    return {
      stageId: stage.id,
      baselineCount,
      scenarioCount,
      baselinePressure,
      scenarioPressure,
      dwellBaseline,
      dwellScenario,
    }
  })

  const bottleneckOutcome = stageOutcomes
    .filter((outcome) => BOTTLENECK_CANDIDATES.has(outcome.stageId))
    .sort((a, b) => b.scenarioPressure - a.scenarioPressure)[0]
  const bottleneckStageId = bottleneckOutcome?.stageId ?? "offer-issued"
  const peakQueue = bottleneckOutcome?.scenarioCount ?? 54
  const avgDelay = Math.max(
    12,
    Math.round(
      42 +
        demandPercent * 0.16 +
        (assumptions.applicationWindow === "high-demand" ? 6 : 0) -
        capacityPercent * 0.16 -
        (assumptions.reviewTurnaround === "faster" ? 6 : 0) -
        (assumptions.reworkRate === "lower" ? 3 : 0),
    ),
  )
  const reworkRate = Math.max(
    6,
    18 - (assumptions.reworkRate === "lower" ? 5 : 0) - (assumptions.reviewTurnaround === "faster" ? 1 : 0),
  )
  const falloutRate = Math.max(
    3,
    7 +
      (demandPercent >= 50 ? 2 : demandPercent >= 25 ? 1 : 0) +
      (assumptions.applicationWindow === "high-demand" ? 1 : 0) -
      (assumptions.reworkRate === "lower" ? 1 : 0),
  )
  const drivers = buildDrivers(assumptions, demandPercent, capacityPercent)
  const baselineBottleneckLabel = stageLabel("offer-issued")
  const bottleneckLabel = stageLabel(bottleneckStageId)

  return {
    id: scenarioId(assumptions),
    name: scenarioName(assumptions, demandPercent, capacityPercent),
    assumptions,
    assumptionSummary: assumptionSummary(assumptions, demandPercent, capacityPercent),
    horizonDays: 90,
    stageOutcomes,
    baselinePeakQueue: 54,
    peakQueue,
    baselineAvgDelay: 42,
    avgDelay,
    baselineReworkRate: 18,
    reworkRate,
    baselineFalloutRate: 7,
    falloutRate,
    baselineBottleneckStageId: "offer-issued",
    bottleneckStageId,
    affectedCohort:
      assumptions.applicationWindow === "high-demand"
        ? "New applications · data centre demand"
        : demandPercent >= 25
          ? "Transition cohort · generation and storage"
          : "Transition cohort · mixed technologies",
    drivers,
    explanation: `${drivers.map((driver) => driver.detail).join(" ")} ${
      bottleneckStageId === "offer-issued"
        ? `${baselineBottleneckLabel} remains the highest-pressure stage under these assumptions.`
        : `The highest-pressure point moves from ${baselineBottleneckLabel} to ${bottleneckLabel}.`
    } Rework and fallout change only where the selected assumptions affect those pathways.`,
    confidenceNote: "Directional synthetic comparison. Human interpretation is required.",
    policyRefs: GUIDANCE,
  }
}

export function scenarioStageOutcome(scenario: SystemScenario, stageId: string): StageScenarioOutcome {
  return scenario.stageOutcomes.find((outcome) => outcome.stageId === stageId) ?? scenario.stageOutcomes[0]
}

export function scenarioStageCounts(scenario: SystemScenario): Record<string, number> {
  return Object.fromEntries(scenario.stageOutcomes.map((outcome) => [outcome.stageId, outcome.scenarioCount]))
}

export function baselineStageCounts(scenario: SystemScenario): Record<string, number> {
  return Object.fromEntries(scenario.stageOutcomes.map((outcome) => [outcome.stageId, outcome.baselineCount]))
}

export function scenarioStagePressures(scenario: SystemScenario): Record<string, number> {
  return Object.fromEntries(scenario.stageOutcomes.map((outcome) => [outcome.stageId, outcome.scenarioPressure]))
}

export function stageLabel(stageId: string): string {
  return STAGES.find((stage) => stage.id === stageId)?.label ?? stageId
}

function buildDrivers(
  assumptions: SystemScenarioAssumptions,
  demandPercent: number,
  capacityPercent: number,
): ScenarioDriver[] {
  const drivers: ScenarioDriver[] = []
  if (demandPercent > 0) {
    drivers.push({
      label: "Future demand",
      detail: `A ${demandPercent}% increase in future applications adds pressure across the modelled journey.`,
    })
  }
  if (assumptions.applicationWindow === "high-demand") {
    drivers.push({
      label: "Application window",
      detail: "A high-demand application window concentrates arrivals around Gate 2 readiness and Offers.",
    })
  }
  if (capacityPercent > 0) {
    drivers.push({
      label: "Processing capacity",
      detail: `${capacityPercent}% additional processing capacity reduces the queue at ${stageLabel(assumptions.capacityStageId)} and releases more work downstream.`,
    })
  }
  if (assumptions.reviewTurnaround === "faster") {
    drivers.push({
      label: "Review turnaround",
      detail: "Faster internal review reduces dwell across readiness, system design, TO design and Offers.",
    })
  }
  if (assumptions.reworkRate === "lower") {
    drivers.push({
      label: "Rework rate",
      detail: "Lower clarification and return rates reduce repeat work through design and readiness stages.",
    })
  }
  if (drivers.length === 0) {
    drivers.push({
      label: "Baseline assumptions",
      detail: "No scenario assumptions differ from the illustrative 90-day baseline.",
    })
  }
  return drivers
}

function assumptionSummary(
  assumptions: SystemScenarioAssumptions,
  demandPercent: number,
  capacityPercent: number,
): string[] {
  const summary: string[] = []
  if (assumptions.applicationWindow === "high-demand") summary.push("High-demand future window")
  if (demandPercent > 0) summary.push(`Future demand +${demandPercent}%`)
  if (capacityPercent > 0) summary.push(`Processing capacity +${capacityPercent}% at ${stageLabel(assumptions.capacityStageId)}`)
  if (assumptions.reviewTurnaround === "faster") summary.push("Faster internal review")
  if (assumptions.reworkRate === "lower") summary.push("Lower clarification rate")
  return summary.length ? summary : ["Baseline assumptions"]
}

function scenarioName(
  assumptions: SystemScenarioAssumptions,
  demandPercent: number,
  capacityPercent: number,
): string {
  if (assumptions.applicationWindow === "high-demand") return "High-demand future window"
  if (demandPercent > 0) return `Future demand +${demandPercent}%`
  if (capacityPercent > 0) return `Capacity change at ${stageLabel(assumptions.capacityStageId)}`
  if (assumptions.reviewTurnaround === "faster") return "Faster review turnaround"
  if (assumptions.reworkRate === "lower") return "Lower clarification rate"
  return "Baseline comparison"
}

function scenarioId(assumptions: SystemScenarioAssumptions): string {
  return [
    assumptions.futureDemand,
    assumptions.capacityStageId,
    assumptions.processingCapacity,
    assumptions.reviewTurnaround,
    assumptions.reworkRate,
    assumptions.applicationWindow,
  ].join("__")
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
