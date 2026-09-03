import { STAGES, type Stage } from "./track-data"
import type { Application, ApplicationCohort } from "./applications"

export type ForecastHorizon = 30 | 60 | 90
export type ForecastRisk = "stable" | "watch" | "emerging" | "constrained"
export type ApplicationRisk = "low" | "medium" | "high"
export type DriverContribution = "high" | "medium" | "low"

interface ForecastDriverSeed {
  label: string
  detail: string
  contribution?: DriverContribution
}

export interface ForecastDriver {
  label: string
  detail: string
  contribution: DriverContribution
}

export interface GuidanceContext {
  title: string
  reference: string
  version: string
  publishedDate: string
  topic: string
  relevantSection: string
  relevantSectionText: string
}

export interface StageForecast {
  stageId: string
  horizonDays: ForecastHorizon
  currentCount: number
  predictedCount: number
  riskLevel: ForecastRisk
  probability: number
  timeToConstraintDays: number | null
  drivers: ForecastDriver[]
  confidence: number
  arrivalsPerWeek: number
  capacityPerWeek: number
}

export interface CohortForecast {
  cohort: ApplicationCohort
  segment: string
  horizonDays: ForecastHorizon
  affectedStageId: string
  riskLevel: ForecastRisk
  probability: number
  shareOfArrivals: number
  drivers: string[]
}

export const FORECAST_HORIZONS: Array<{ value: ForecastHorizon; label: string; detail: string }> = [
  { value: 30, label: "30 days", detail: "Near-term warning" },
  { value: 60, label: "60 days", detail: "Planning window" },
  { value: 90, label: "90 days", detail: "Quarter outlook" },
]

const FORECAST_COUNTS: Record<ForecastHorizon, number[]> = {
  30: [136, 130, 106, 96, 95, 81, 77, 55, 40, 37, 32],
  60: [145, 134, 108, 99, 97, 84, 84, 65, 42, 39, 34],
  90: [154, 139, 113, 103, 101, 89, 91, 76, 45, 41, 36],
}

interface StageSignalConfig {
  arrivalsPerWeek: number
  capacityPerWeek: number
  probability: Record<ForecastHorizon, number>
  timeToConstraintDays: number | null
  drivers: ForecastDriverSeed[]
}

function rankForecastDrivers(drivers: ForecastDriverSeed[]): ForecastDriver[] {
  return drivers.map((driver, index) => ({
    ...driver,
    contribution: driver.contribution ?? (index === 0 ? "high" : index === 1 ? "medium" : "low"),
  }))
}

const STAGE_SIGNALS: Partial<Record<string, StageSignalConfig>> = {
  "to-design": {
    arrivalsPerWeek: 23,
    capacityPerWeek: 16,
    probability: { 30: 96, 60: 97, 90: 98 },
    timeToConstraintDays: 0,
    drivers: [
      {
        label: "Current TO design queue",
        detail: "Specialist reviews continue to complete more slowly than cases arrive.",
      },
    ],
  },
  "system-design": {
    arrivalsPerWeek: 15,
    capacityPerWeek: 12,
    probability: { 30: 58, 60: 76, 90: 89 },
    timeToConstraintDays: 48,
    drivers: [
      {
        label: "Re-study demand",
        detail: "Re-study demand and reinforcement dependencies consume forecast system-design capacity.",
      },
    ],
  },
  "gate2-readiness": {
    arrivalsPerWeek: 16,
    capacityPerWeek: 14,
    probability: { 30: 52, 60: 61, 90: 74 },
    timeToConstraintDays: 72,
    drivers: [
      {
        label: "Repeat readiness checks",
        detail: "Returned evidence increases repeat checks and reduces effective throughput.",
      },
    ],
  },
  "offer-issued": {
    arrivalsPerWeek: 18,
    capacityPerWeek: 12,
    probability: { 30: 84, 60: 92, 90: 96 },
    timeToConstraintDays: 21,
    drivers: [
      {
        label: "Arrival exceeds capacity",
        detail: "Applications clearing Gate 2 reach Offers faster than current offer-production capacity can process them.",
        contribution: "high",
      },
      {
        label: "Upstream dwell",
        detail: "Longer dwell through Gate 2 is forecast to release a clustered wave of applications into Offers.",
        contribution: "medium",
      },
      {
        label: "Rework demand",
        detail: "Returned evidence and repeat assurance checks reduce the effective capacity available for new Offers work.",
        contribution: "medium",
      },
      {
        label: "Cohort contribution",
        detail: "Transition-cohort data-centre demand forms the largest share of forecast arrivals in the same short-term window.",
        contribution: "medium",
      },
    ],
  },
}

export const FORECAST_RISK_META: Record<ForecastRisk, { label: string; className: string }> = {
  stable: { label: "Stable", className: "bg-success-muted text-success" },
  watch: { label: "Watch", className: "bg-anticipate-muted text-anticipate" },
  emerging: { label: "Emerging", className: "bg-queue-muted text-queue" },
  constrained: { label: "Constrained", className: "bg-danger-muted text-danger" },
}

export function forecastRiskForStage(stageId: string, horizon: ForecastHorizon): ForecastRisk {
  if (stageId === "to-design") return "constrained"
  if (stageId === "offer-issued") return horizon === 30 ? "emerging" : "constrained"
  if (stageId === "system-design") return horizon === 30 ? "watch" : horizon === 60 ? "emerging" : "constrained"
  if (stageId === "gate2-readiness") return horizon === 90 ? "emerging" : "watch"
  return "stable"
}

function defaultProbability(risk: ForecastRisk, horizon: ForecastHorizon): number {
  const base = risk === "constrained" ? 90 : risk === "emerging" ? 76 : risk === "watch" ? 52 : 18
  return Math.min(98, base + (horizon === 60 ? 3 : horizon === 90 ? 6 : 0))
}

function buildStageForecast(stageId: string, stageIndex: number, horizon: ForecastHorizon): StageForecast {
  const stage = STAGES[stageIndex]
  const riskLevel = forecastRiskForStage(stageId, horizon)
  const predictedCount = FORECAST_COUNTS[horizon][stageIndex]
  const configured = STAGE_SIGNALS[stageId]
  const arrivalsPerWeek = configured?.arrivalsPerWeek ?? Math.max(4, Math.round(predictedCount * 0.25))
  const capacityPerWeek = configured?.capacityPerWeek ?? Math.max(arrivalsPerWeek, Math.round(stage.counts.today * 0.28))

  return {
    stageId,
    horizonDays: horizon,
    currentCount: stage.counts.today,
    predictedCount,
    riskLevel,
    probability: configured?.probability[horizon] ?? defaultProbability(riskLevel, horizon),
    timeToConstraintDays: configured?.timeToConstraintDays ?? null,
    drivers: rankForecastDrivers(
      configured?.drivers ??
        [{ label: "Current flow pattern", detail: "No material short-term departure from current throughput is forecast." }],
    ),
    confidence: horizon === 30 ? 86 : horizon === 60 ? 81 : 76,
    arrivalsPerWeek,
    capacityPerWeek,
  }
}

export const STAGE_FORECASTS: StageForecast[] = FORECAST_HORIZONS.flatMap(({ value: horizon }) =>
  STAGES.map((stage, stageIndex) => buildStageForecast(stage.id, stageIndex, horizon)),
)

export function stageForecastFor(stageId: string, horizon: ForecastHorizon): StageForecast {
  return (
    STAGE_FORECASTS.find((forecast) => forecast.stageId === stageId && forecast.horizonDays === horizon) ??
    buildStageForecast(STAGES[0].id, 0, horizon)
  )
}

export function forecastStageCounts(horizon: ForecastHorizon, scale = 1): Record<string, number> {
  return Object.fromEntries(
    STAGE_FORECASTS.filter((forecast) => forecast.horizonDays === horizon).map((forecast) => [
      forecast.stageId,
      Math.round(forecast.predictedCount * scale),
    ]),
  )
}

export function forecastStageDetail(stageId: string, horizon: ForecastHorizon, scale = 1) {
  const forecast = stageForecastFor(stageId, horizon)
  const stage = STAGES.find((item) => item.id === forecast.stageId) ?? STAGES[0]
  const current = Math.round(forecast.currentCount * scale)
  const projected = Math.round(forecast.predictedCount * scale)

  return {
    ...forecast,
    stage,
    current,
    projected,
    change: projected - current,
    risk: forecast.riskLevel,
    arrivals: Math.round(forecast.arrivalsPerWeek * scale),
    capacity: Math.round(forecast.capacityPerWeek * scale),
    driver: forecast.drivers[0].detail,
  }
}

const COHORT_SHARES: Record<ForecastHorizon, [number, number, number]> = {
  30: [43, 34, 23],
  60: [46, 35, 19],
  90: [49, 32, 19],
}

const COHORTS: Array<{ cohort: ApplicationCohort; segment: string; drivers: string[] }> = [
  {
    cohort: "Transition cohort",
    segment: "Data centre demand",
    drivers: ["Highest projected Offers arrival volume", "Several large demand cases share the same arrival window"],
  },
  {
    cohort: "Legacy queue",
    segment: "Complex generation and interconnection",
    drivers: ["Complex cases require more offer-production capacity"],
  },
  {
    cohort: "New applications",
    segment: "New generation and storage",
    drivers: ["Lower but increasing short-term arrival pressure"],
  },
]

export const COHORT_FORECASTS: CohortForecast[] = FORECAST_HORIZONS.flatMap(({ value: horizon }) =>
  COHORTS.map((entry, index) => ({
    ...entry,
    horizonDays: horizon,
    affectedStageId: "offer-issued",
    riskLevel: index === 0 ? "emerging" : index === 1 ? "watch" : "stable",
    probability: index === 0 ? (horizon === 30 ? 78 : horizon === 60 ? 84 : 88) : index === 1 ? 61 : 38,
    shareOfArrivals: COHORT_SHARES[horizon][index],
  })),
)

export function cohortForecastsFor(horizon: ForecastHorizon): CohortForecast[] {
  return COHORT_FORECASTS.filter((forecast) => forecast.horizonDays === horizon)
}

export type SystemInsightId = "next-bottleneck" | "emerging-constraint" | "flow-degradation" | "at-risk-cohort"

export interface SystemForecastInsight {
  id: SystemInsightId
  label: string
  value: string
  detail: string
  tone: "primary" | "warning" | "danger"
}

export function systemForecastInsights(horizon: ForecastHorizon): SystemForecastInsight[] {
  const offer = stageForecastFor("offer-issued", horizon)
  const leadingCohort = cohortForecastsFor(horizon)[0]
  const offerStage = STAGES.find((stage) => stage.id === "offer-issued") ?? STAGES[0]
  const upstreamStage = STAGES.find((stage) => stage.id === "to-design") ?? STAGES[0]

  return [
    {
      id: "next-bottleneck",
      label: "Next likely bottleneck",
      value: offerStage.label,
      detail: `High likelihood | ~${Math.ceil((offer.timeToConstraintDays ?? 21) / 7)} weeks`,
      tone: "danger",
    },
    {
      id: "emerging-constraint",
      label: "Emerging constraint",
      value: offerStage.label,
      detail: `${offer.arrivalsPerWeek}/week arriving | ${offer.capacityPerWeek}/week capacity`,
      tone: "warning",
    },
    {
      id: "flow-degradation",
      label: "Flow likely to degrade",
      value: `${upstreamStage.label} -> ${offerStage.label}`,
      detail: `Pressure increasing over the next ${horizon} days`,
      tone: "primary",
    },
    {
      id: "at-risk-cohort",
      label: "At-risk cohort",
      value: leadingCohort.segment,
      detail: `${leadingCohort.shareOfArrivals}% of forecast Offers arrivals | ${leadingCohort.cohort}`,
      tone: "primary",
    },
  ]
}

const GUIDANCE_BY_STAGE: Record<string, GuidanceContext> = {
  "to-design": {
    title: "Connections Design Evidence Guide",
    reference: "Illustrative guidance CON-GD-04",
    version: "v2.1",
    publishedDate: "15 May 2025",
    topic: "Design evidence and unresolved dependencies",
    relevantSection: "Section 4.2 - Design dependency evidence",
    relevantSectionText: "Illustrative context: design dependencies should have a recorded owner, evidence status and expected resolution date before progression.",
  },
  "system-design": {
    title: "Connections System Design Guide",
    reference: "Illustrative guidance CON-SS-07",
    version: "v1.4",
    publishedDate: "3 April 2025",
    topic: "System design dependencies and evidence",
    relevantSection: "Section 7.1 - Repeat study controls",
    relevantSectionText: "Illustrative context: repeat studies should record the changed assumption, specialist owner and revised completion milestone.",
  },
  "gate2-readiness": {
    title: "Gate 2 Criteria Methodology",
    reference: "Illustrative guidance CON-G2-02",
    version: "v1.2",
    publishedDate: "20 June 2025",
    topic: "Readiness evidence requirements",
    relevantSection: "Section 2.3 - Evidence completeness",
    relevantSectionText: "Illustrative context: readiness review requires the relevant land, planning and technical evidence to be present and internally consistent.",
  },
  "offer-issued": {
    title: "Connections Offer Assurance Guide",
    reference: "Illustrative guidance CON-OF-03",
    version: "v1.6",
    publishedDate: "11 July 2025",
    topic: "Offer preparation and assurance",
    relevantSection: "Section 3.4 - Offer production dependencies",
    relevantSectionText: "Illustrative context: offer preparation should identify outstanding technical dependencies and the evidence required before assurance.",
  },
  "strategic-alignment": {
    title: "Strategic Alignment Assessment Guide",
    reference: "Illustrative guidance CON-SA-05",
    version: "v1.3",
    publishedDate: "28 March 2025",
    topic: "Strategic alignment evidence",
    relevantSection: "Section 5.2 - Alignment evidence",
    relevantSectionText: "Illustrative context: strategic alignment should be assessed against the recorded project evidence and current methodology.",
  },
  "gated-outcome": {
    title: "Connections Gated Outcome Guide",
    reference: "Illustrative guidance CON-GO-02",
    version: "v2.0",
    publishedDate: "9 May 2025",
    topic: "Gate 1 and Gate 2 outcomes",
    relevantSection: "Section 2.5 - Gated outcome evidence",
    relevantSectionText: "Illustrative context: the gated outcome should be supported by the completed readiness and strategic alignment record.",
  },
  "securities-received": {
    title: "Connections Securities Guide",
    reference: "Illustrative guidance CON-FS-01",
    version: "v1.5",
    publishedDate: "17 April 2025",
    topic: "Securities and charging evidence",
    relevantSection: "Section 1.4 - Securities receipt checks",
    relevantSectionText: "Illustrative context: securities status and associated charging records should be reconciled before milestone management.",
  },
  "milestone-management": {
    title: "Connections Milestone Management Guide",
    reference: "Illustrative guidance CON-MM-03",
    version: "v1.1",
    publishedDate: "24 April 2025",
    topic: "Post-offer milestone management",
    relevantSection: "Section 3.1 - Milestone evidence",
    relevantSectionText: "Illustrative context: milestone status should be supported by current evidence, ownership and expected completion dates.",
  },
}

interface ApplicationForecastProfile {
  applicationId: string
  failureStageId: string
  baseRisk: number
  daysToThreshold: number | null
  dwellGrowth: number
  confidence: number
  dataCoverage: number
  cohortMedianDays: number
  outcome: string
  drivers: ForecastDriverSeed[]
}

const APPLICATION_FORECAST_PROFILES: ApplicationForecastProfile[] = [
  {
    applicationId: "meridian-data-campus",
    failureStageId: "to-design",
    baseRisk: 96,
    daysToThreshold: 0,
    dwellGrowth: 0.82,
    confidence: 88,
    dataCoverage: 94,
    cohortMedianDays: 36,
    outcome: "The current TO design stall is likely to persist through the forecast window.",
    drivers: [
      { label: "Unscheduled reinforcement study", detail: "The primary dependency has no recorded completion date." },
      { label: "Repeated clarification", detail: "Two previous returns increase the likelihood of another incomplete cycle." },
      { label: "Stage capacity", detail: "TO design demand is forecast to remain above available throughput." },
    ],
  },
  {
    applicationId: "riverbend-solar",
    failureStageId: "offer-issued",
    baseRisk: 68,
    daysToThreshold: 19,
    dwellGrowth: 0.48,
    confidence: 82,
    dataCoverage: 91,
    cohortMedianDays: 27,
    outcome: "Likely to clear design review but encounter the emerging Offers queue.",
    drivers: [
      { label: "Offers arrival rate", detail: "Forecast arrivals exceed current offer-production capacity." },
      { label: "Shared cohort timing", detail: "Comparable solar applications are forecast to arrive in the same window." },
    ],
  },
  {
    applicationId: "north-fen-wind",
    failureStageId: "to-design",
    baseRisk: 91,
    daysToThreshold: 12,
    dwellGrowth: 0.75,
    confidence: 87,
    dataCoverage: 93,
    cohortMedianDays: 38,
    outcome: "Likely to miss its planning-condition window while TO design remains constrained.",
    drivers: [
      { label: "Planning condition", detail: "The recorded condition expires before the forecast stage-clearance date." },
      { label: "Reinforcement dependency", detail: "The shared study remains coupled to another delayed application." },
    ],
  },
  {
    applicationId: "eastport-interconnector",
    failureStageId: "system-design",
    baseRisk: 88,
    daysToThreshold: 9,
    dwellGrowth: 0.7,
    confidence: 85,
    dataCoverage: 89,
    cohortMedianDays: 49,
    outcome: "The open re-study is likely to keep the application above its system-design dwell target.",
    drivers: [
      { label: "Fault-level re-study", detail: "A repeat study cycle is already recorded and remains incomplete." },
      { label: "Specialist capacity", detail: "Forecast study demand is above available specialist throughput." },
    ],
  },
  {
    applicationId: "clyde-battery",
    failureStageId: "gate2-readiness",
    baseRisk: 82,
    daysToThreshold: 14,
    dwellGrowth: 0.61,
    confidence: 84,
    dataCoverage: 90,
    cohortMedianDays: 24,
    outcome: "Likely to remain in a repeat readiness cycle because two evidence items are incomplete.",
    drivers: [
      { label: "Missing land evidence", detail: "Land-rights confirmation is not present in the current record." },
      { label: "Diagram outstanding", detail: "The updated single-line diagram has not yet been received." },
    ],
  },
  {
    applicationId: "harbour-demand",
    failureStageId: "milestone-management",
    baseRisk: 28,
    daysToThreshold: null,
    dwellGrowth: 0.18,
    confidence: 79,
    dataCoverage: 88,
    cohortMedianDays: 72,
    outcome: "Expected to remain within the milestone-management dwell range.",
    drivers: [{ label: "Current progression", detail: "Recorded milestones remain consistent with comparable demand applications." }],
  },
  {
    applicationId: "greenmoor-hybrid",
    failureStageId: "gate2-readiness",
    baseRisk: 64,
    daysToThreshold: 24,
    dwellGrowth: 0.46,
    confidence: 76,
    dataCoverage: 83,
    cohortMedianDays: 16,
    outcome: "A further metering clarification could extend the current readiness return cycle.",
    drivers: [
      { label: "Hybrid metering ambiguity", detail: "The import and export split remains unresolved." },
      { label: "Limited comparable evidence", detail: "The cohort contains fewer directly comparable hybrid cases." },
    ],
  },
  {
    applicationId: "seaton-offshore",
    failureStageId: "offer-issued",
    baseRisk: 58,
    daysToThreshold: 27,
    dwellGrowth: 0.35,
    confidence: 80,
    dataCoverage: 92,
    cohortMedianDays: 29,
    outcome: "Currently progressing, with exposure to the forecast Offers capacity constraint.",
    drivers: [
      { label: "Large offer complexity", detail: "The 800 MW connection requires more offer-production effort than the cohort median." },
      { label: "Forecast queue", detail: "The application is expected to reach Offers as the stage becomes constrained." },
    ],
  },
  {
    applicationId: "willow-solar",
    failureStageId: "gate2-readiness",
    baseRisk: 84,
    daysToThreshold: 8,
    dwellGrowth: 0.68,
    confidence: 86,
    dataCoverage: 90,
    cohortMedianDays: 65,
    outcome: "The unresolved easement is likely to keep the application above its readiness-check target.",
    drivers: [
      { label: "Third-party easement", detail: "No resolution milestone is recorded for the outstanding negotiation." },
      { label: "Current dwell", detail: "Time in stage is already materially above the comparable cohort median." },
    ],
  },
  {
    applicationId: "pennine-battery",
    failureStageId: "offer-issued",
    baseRisk: 76,
    daysToThreshold: 21,
    dwellGrowth: 0.52,
    confidence: 81,
    dataCoverage: 87,
    cohortMedianDays: 28,
    outcome: "Likely to join the emerging Offers queue after clearing TO design.",
    drivers: [
      { label: "Downstream capacity", detail: "Offer-production demand is forecast to exceed weekly completion capacity." },
      { label: "Arrival timing", detail: "The expected stage transition falls inside the highest-volume forecast window." },
    ],
  },
  {
    applicationId: "fenland-solar",
    failureStageId: "gated-outcome",
    baseRisk: 22,
    daysToThreshold: null,
    dwellGrowth: 0.14,
    confidence: 83,
    dataCoverage: 93,
    cohortMedianDays: 19,
    outcome: "Expected to progress from its Gate 1 outcome within the cohort range.",
    drivers: [{ label: "Comparable progression", detail: "Current timing aligns with similar new solar applications." }],
  },
  {
    applicationId: "dockside-demand",
    failureStageId: "securities-received",
    baseRisk: 42,
    daysToThreshold: 38,
    dwellGrowth: 0.25,
    confidence: 77,
    dataCoverage: 86,
    cohortMedianDays: 26,
    outcome: "Offer acceptance is expected, with moderate uncertainty around securities receipt.",
    drivers: [{ label: "Acceptance timing", detail: "The customer acceptance date is not yet recorded." }],
  },
]

const PROFILE_BY_APPLICATION = new Map(
  APPLICATION_FORECAST_PROFILES.map((profile) => [profile.applicationId, profile]),
)

export interface ApplicationPrediction {
  applicationId: string
  horizonDays: ForecastHorizon
  predictedIssue: string
  riskLevel: ApplicationRisk
  probability: number
  drivers: ForecastDriver[]
  confidence: number
  dataCompleteness: number
  policyRefs: string[]
  failureStageId: string
  daysToThreshold: number | null
  dwellGrowth: number
  baseRisk: number
  dataCoverage: number
  cohortMedianDays: number
  outcome: string
  application: Application
  risk: number
  riskBand: ApplicationRisk
  projectedDaysInStage: number
  projectedDaysOverTarget: number
  failureStage: Stage
  guidance: GuidanceContext
  agentExplanation: string
  explanationSources: string[]
}

export const APPLICATION_RISK_META: Record<ApplicationRisk, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-success-muted text-success" },
  medium: { label: "Medium", className: "bg-anticipate-muted text-anticipate" },
  high: { label: "High", className: "bg-danger-muted text-danger" },
}

function riskBand(risk: number): ApplicationRisk {
  if (risk >= 70) return "high"
  if (risk >= 45) return "medium"
  return "low"
}

function joinDriverLabels(drivers: ForecastDriver[]): string {
  const labels = drivers.slice(0, 3).map((driver) => driver.label.toLowerCase())
  if (labels.length <= 1) return labels[0] ?? "the current journey pattern"
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`
}

function buildAgentExplanation(
  application: Application,
  risk: ApplicationRisk,
  failureStage: Stage,
  drivers: ForecastDriver[],
  guidance: GuidanceContext,
): string {
  return `${application.name} has been flagged for ${risk} short-term risk at ${failureStage.label} because ${joinDriverLabels(drivers)}. The application is currently ${application.daysInStage} days into ${STAGES.find((stage) => stage.id === application.stageId)?.label ?? "its current stage"}, against a ${application.targetDays}-day target. ${guidance.title} provides relevant context for ${guidance.topic.toLowerCase()}.`
}

export function applicationForecast(application: Application, horizon: ForecastHorizon): ApplicationPrediction {
  const profile = PROFILE_BY_APPLICATION.get(application.id)
  const fallback: ApplicationForecastProfile = {
    applicationId: application.id,
    failureStageId: application.stageId,
    baseRisk: 35,
    daysToThreshold: null,
    dwellGrowth: 0.2,
    confidence: 72,
    dataCoverage: 80,
    cohortMedianDays: application.targetDays,
    outcome: "No material departure from the current journey pattern is forecast.",
    drivers: [{ label: "Current journey pattern", detail: "No strong adverse signal is present in the illustrative record." }],
  }
  const selected = profile ?? fallback
  const horizonAdjustment = horizon === 30 ? -8 : horizon === 90 ? 8 : 0
  const risk = Math.max(5, Math.min(99, selected.baseRisk + horizonAdjustment))
  const projectedDaysInStage = Math.round(application.daysInStage + horizon * selected.dwellGrowth)
  const drivers = rankForecastDrivers(selected.drivers)
  const applicationRisk = riskBand(risk)
  const failureStage = STAGES.find((stage) => stage.id === selected.failureStageId) ?? STAGES[0]
  const guidance =
    GUIDANCE_BY_STAGE[selected.failureStageId] ?? {
      title: "Connections Journey Stage Guide",
      reference: "Illustrative guidance CON-JR-01",
      version: "v1.0",
      publishedDate: "1 April 2025",
      topic: "Connections journey evidence",
      relevantSection: "Section 1.1 - Journey evidence",
      relevantSectionText: "Illustrative context: current journey status, evidence and dependencies should be recorded before progression.",
    }

  return {
    ...selected,
    drivers,
    horizonDays: horizon,
    predictedIssue: selected.outcome,
    riskLevel: applicationRisk,
    probability: risk,
    dataCompleteness: selected.dataCoverage,
    policyRefs: [guidance.reference],
    application,
    risk,
    riskBand: applicationRisk,
    projectedDaysInStage,
    projectedDaysOverTarget: Math.max(0, projectedDaysInStage - application.targetDays),
    failureStage,
    guidance,
    agentExplanation: buildAgentExplanation(application, applicationRisk, failureStage, drivers, guidance),
    explanationSources: ["Case data", "Prediction", "Model drivers", "Relevant guidance"],
  }
}

export type ApplicationForecast = ApplicationPrediction
