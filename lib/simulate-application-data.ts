import type { Application } from "./applications"
import { applicationForecast, type ApplicationRisk, type GuidanceContext } from "./predict-data"
import { STAGES } from "./track-data"
import type { WindowAssumption } from "./simulate-data"

export type EvidenceExpectedDays = 5 | 10 | 20
export type DependencyResolution = "unresolved" | "7-days" | "14-days"
export type ApplicantResponseSla = "current" | "5-days"
export type EvidenceAssumption = "outstanding" | "confirmed"
export type ApplicationReviewTurnaround = "current" | "faster"

export interface ApplicationScenarioAssumptions {
  evidenceExpectedDays: EvidenceExpectedDays
  dependencyResolution: DependencyResolution
  applicantResponseSla: ApplicantResponseSla
  planningEvidence: EvidenceAssumption
  landRightsEvidence: EvidenceAssumption
  reviewTurnaround: ApplicationReviewTurnaround
}

export interface ApplicationScenarioDriver {
  label: string
  detail: string
}

export interface ApplicationScenarioOutcome {
  id: string
  applicationId: string
  assumptions: ApplicationScenarioAssumptions
  baselineTimeToNextStageWeeks: number
  scenarioTimeToNextStageWeeks: number
  baselineClarificationCycles: number
  scenarioClarificationCycles: number
  baselineReadiness: "Low" | "Moderate" | "Good"
  scenarioReadiness: "Low" | "Moderate" | "Improved"
  baselineDelayRisk: ApplicationRisk
  scenarioDelayRisk: ApplicationRisk
  currentTrajectory: string[]
  scenarioTrajectory: string[]
  drivers: ApplicationScenarioDriver[]
  explanation: string
  guidance: GuidanceContext
  scenarioConfidence: "Indicative"
}

export interface CohortScenarioInsight {
  cohort: string
  pressure: "Low" | "Medium" | "High"
  stage: string
  detail: string
}

export const DEFAULT_APPLICATION_SCENARIO_ASSUMPTIONS: ApplicationScenarioAssumptions = {
  evidenceExpectedDays: 10,
  dependencyResolution: "7-days",
  applicantResponseSla: "5-days",
  planningEvidence: "confirmed",
  landRightsEvidence: "confirmed",
  reviewTurnaround: "faster",
}

export const BASELINE_APPLICATION_SCENARIO_ASSUMPTIONS: ApplicationScenarioAssumptions = {
  evidenceExpectedDays: 20,
  dependencyResolution: "unresolved",
  applicantResponseSla: "current",
  planningEvidence: "outstanding",
  landRightsEvidence: "outstanding",
  reviewTurnaround: "current",
}

export const EVIDENCE_DAY_OPTIONS: Array<{ value: EvidenceExpectedDays; label: string }> = [
  { value: 5, label: "5 days" },
  { value: 10, label: "10 days" },
  { value: 20, label: "20 days" },
]

export const DEPENDENCY_OPTIONS: Array<{ value: DependencyResolution; label: string }> = [
  { value: "unresolved", label: "Unresolved" },
  { value: "7-days", label: "7 days" },
  { value: "14-days", label: "14 days" },
]

export const APPLICANT_SLA_OPTIONS: Array<{ value: ApplicantResponseSla; label: string }> = [
  { value: "current", label: "Current" },
  { value: "5-days", label: "5 days" },
]

export const EVIDENCE_STATE_OPTIONS: Array<{ value: EvidenceAssumption; label: string }> = [
  { value: "outstanding", label: "Outstanding" },
  { value: "confirmed", label: "Confirmed" },
]

export const APPLICATION_REVIEW_OPTIONS: Array<{ value: ApplicationReviewTurnaround; label: string }> = [
  { value: "current", label: "Current" },
  { value: "faster", label: "Faster" },
]

export function buildApplicationScenario(
  application: Application,
  assumptions: ApplicationScenarioAssumptions,
): ApplicationScenarioOutcome {
  const forecast = applicationForecast(application, 30)
  const baselineRisk = forecast.riskBand
  const baselineTime = baselineWeeks(application, baselineRisk)
  const baselineCycles = baselineClarificationCycles(application)
  const drivers = applicationScenarioDrivers(assumptions)
  const improvementScore = applicationImprovementScore(assumptions)
  const timeReduction = Math.min(4, Math.floor(improvementScore / 2) + (assumptions.dependencyResolution === "7-days" ? 1 : 0))
  const scenarioTime = Math.max(2, baselineTime - timeReduction)
  const cycleReduction =
    improvementScore >= 9 ? 2 : improvementScore >= 3 || assumptions.applicantResponseSla === "5-days" ? 1 : 0
  const scenarioCycles = Math.max(0, baselineCycles - cycleReduction)
  const scenarioRisk = adjustedRisk(baselineRisk, improvementScore)
  const currentTrajectory = currentTrajectoryFor(application, forecast.failureStage.label, baselineCycles)
  const scenarioTrajectory = scenarioTrajectoryFor(application, improvementScore, scenarioCycles)
  const scenarioReadiness = readinessForScenario(baselineRisk, improvementScore)
  const explanation = buildApplicationExplanation(application, assumptions, scenarioCycles, drivers)

  return {
    id: applicationScenarioId(application.id, assumptions),
    applicationId: application.id,
    assumptions,
    baselineTimeToNextStageWeeks: baselineTime,
    scenarioTimeToNextStageWeeks: scenarioTime,
    baselineClarificationCycles: baselineCycles,
    scenarioClarificationCycles: scenarioCycles,
    baselineReadiness: readinessForRisk(baselineRisk),
    scenarioReadiness,
    baselineDelayRisk: baselineRisk,
    scenarioDelayRisk: scenarioRisk,
    currentTrajectory,
    scenarioTrajectory,
    drivers,
    explanation,
    guidance: forecast.guidance,
    scenarioConfidence: "Indicative",
  }
}

export function applicationEvidenceStatus(application: Application): string {
  const evidenceText = application.blockers.map((blocker) => `${blocker.label} ${blocker.detail}`).join(" ")
  if (/evidence|land right|planning|diagram|profile|metering/i.test(evidenceText)) return "Outstanding items recorded"
  if (application.blockers.length > 0) return "Partial evidence recorded"
  return "No current evidence gap"
}

export function applicationDependencies(application: Application): string[] {
  const dependencies = application.blockers
    .filter((blocker) => /depend|study|reinforcement|design|third-party|condition/i.test(`${blocker.label} ${blocker.detail}`))
    .map((blocker) => blocker.label)
  return dependencies.length ? dependencies : ["No material dependency recorded"]
}

export function cohortScenarioInsights(window: WindowAssumption): CohortScenarioInsight[] {
  if (window === "high-demand") {
    return [
      {
        cohort: "Data centres",
        pressure: "High",
        stage: "Offers",
        detail: "Concentrated demand arrivals increase offer-production pressure.",
      },
      {
        cohort: "BESS",
        pressure: "Medium",
        stage: "Gate 2 readiness",
        detail: "Readiness evidence creates moderate repeat-review demand.",
      },
      {
        cohort: "Solar",
        pressure: "Low",
        stage: "Gate 1 assessment",
        detail: "Limited change in the selected future window.",
      },
    ]
  }
  return [
    {
      cohort: "Data centres",
      pressure: "Medium",
      stage: "Offers",
      detail: "Demand remains within the illustrative baseline range.",
    },
    {
      cohort: "BESS",
      pressure: "Medium",
      stage: "Gate 2 readiness",
      detail: "Evidence completeness remains the main shared sensitivity.",
    },
    {
      cohort: "Solar",
      pressure: "Low",
      stage: "Gate 1 assessment",
      detail: "No material scenario departure is indicated.",
    },
  ]
}

function applicationImprovementScore(assumptions: ApplicationScenarioAssumptions): number {
  let score = assumptions.evidenceExpectedDays === 5 ? 3 : assumptions.evidenceExpectedDays === 10 ? 1 : 0
  if (assumptions.dependencyResolution === "7-days") score += 2
  if (assumptions.dependencyResolution === "14-days") score += 1
  if (assumptions.applicantResponseSla === "5-days") score += 1
  if (assumptions.planningEvidence === "confirmed") score += 1
  if (assumptions.landRightsEvidence === "confirmed") score += 1
  if (assumptions.reviewTurnaround === "faster") score += 1
  return score
}

function applicationScenarioDrivers(assumptions: ApplicationScenarioAssumptions): ApplicationScenarioDriver[] {
  const drivers: ApplicationScenarioDriver[] = []
  if (assumptions.evidenceExpectedDays < 20) {
    drivers.push({
      label: "Evidence timing",
      detail: `Outstanding evidence is assumed available in ${assumptions.evidenceExpectedDays} days.`,
    })
  }
  if (assumptions.dependencyResolution !== "unresolved") {
    drivers.push({
      label: "Dependency resolution",
      detail: `The recorded dependency is assumed resolved within ${assumptions.dependencyResolution === "7-days" ? 7 : 14} days.`,
    })
  }
  if (assumptions.applicantResponseSla === "5-days") {
    drivers.push({
      label: "Applicant response",
      detail: "Applicant clarification responses are assumed within five days.",
    })
  }
  if (assumptions.planningEvidence === "confirmed") {
    drivers.push({ label: "Planning evidence", detail: "Planning evidence is assumed confirmed for the scenario." })
  }
  if (assumptions.landRightsEvidence === "confirmed") {
    drivers.push({ label: "Land-rights evidence", detail: "Land-rights evidence is assumed confirmed for the scenario." })
  }
  if (assumptions.reviewTurnaround === "faster") {
    drivers.push({ label: "Internal review", detail: "Internal review is assumed to complete faster than the baseline." })
  }
  if (drivers.length === 0) {
    drivers.push({ label: "Baseline assumptions", detail: "No application assumptions differ from the predicted baseline." })
  }
  return drivers
}

function buildApplicationExplanation(
  application: Application,
  assumptions: ApplicationScenarioAssumptions,
  scenarioCycles: number,
  drivers: ApplicationScenarioDriver[],
): string {
  if (drivers.length === 1 && drivers[0].label === "Baseline assumptions") {
    return `${application.name} retains its predicted baseline journey because no scenario assumption has changed.`
  }
  const evidenceParts: string[] = []
  if (assumptions.landRightsEvidence === "confirmed") evidenceParts.push("land-rights evidence is assumed confirmed")
  if (assumptions.planningEvidence === "confirmed") evidenceParts.push("planning evidence is assumed confirmed")
  if (assumptions.dependencyResolution !== "unresolved") {
    evidenceParts.push(`the design dependency is assumed resolved within ${assumptions.dependencyResolution === "7-days" ? 7 : 14} days`)
  }
  if (assumptions.reviewTurnaround === "faster") evidenceParts.push("internal review is assumed faster")
  const reason = joinPhrases(evidenceParts.length ? evidenceParts : drivers.slice(0, 2).map((driver) => driver.detail.toLowerCase()))
  return `The indicative journey changes because ${reason}. Under those assumptions, the scenario contains ${scenarioCycles} clarification ${scenarioCycles === 1 ? "cycle" : "cycles"} before the next readiness stage.`
}

function baselineWeeks(application: Application, risk: ApplicationRisk): number {
  if (application.id === "meridian-data-campus") return 11
  const dwellComponent = Math.max(0, application.daysInStage - application.targetDays) / 14
  return Math.max(3, Math.round((risk === "high" ? 8 : risk === "medium" ? 6 : 4) + dwellComponent))
}

function baselineClarificationCycles(application: Application): number {
  if (application.id === "meridian-data-campus") return 2
  const text = `${application.summary} ${application.blockers.map((blocker) => blocker.label).join(" ")}`
  if (/two clarification/i.test(text)) return 2
  if (/return|rework|re-study|clarification/i.test(text)) return 1
  return application.blockers.length > 1 ? 1 : 0
}

function adjustedRisk(risk: ApplicationRisk, score: number): ApplicationRisk {
  if (score < 3) return risk
  if (risk === "high") return score >= 8 ? "low" : "medium"
  if (risk === "medium") return "low"
  return "low"
}

function readinessForRisk(risk: ApplicationRisk): "Low" | "Moderate" | "Good" {
  if (risk === "high") return "Low"
  if (risk === "medium") return "Moderate"
  return "Good"
}

function readinessForScenario(risk: ApplicationRisk, score: number): "Low" | "Moderate" | "Improved" {
  if (score >= 3) return "Improved"
  return risk === "high" ? "Low" : "Moderate"
}

function currentTrajectoryFor(application: Application, failureStage: string, cycles: number): string[] {
  const currentStage = stageLabel(application.stageId)
  if (application.id === "meridian-data-campus") {
    return [currentStage, "Clarification", "Design rework", "Gate 2 readiness"]
  }
  if (cycles > 0) return [currentStage, "Clarification", failureStage]
  return [currentStage, failureStage]
}

function scenarioTrajectoryFor(application: Application, score: number, cycles: number): string[] {
  const currentIndex = Math.max(0, STAGES.findIndex((stage) => stage.id === application.stageId))
  const currentStage = STAGES[currentIndex]?.label ?? "Current stage"
  const nextStage = STAGES[Math.min(STAGES.length - 1, currentIndex + 1)]?.label ?? currentStage
  const followingStage = STAGES[Math.min(STAGES.length - 1, currentIndex + 2)]?.label ?? nextStage
  if (application.id === "meridian-data-campus" && score >= 3) {
    return score >= 8
      ? [currentStage, "Gate 2 readiness", "Gate 2 assessment"]
      : [currentStage, "Focused clarification", "Gate 2 readiness", "Gate 2 assessment"]
  }
  if (cycles > 0) return [currentStage, "Clarification", nextStage]
  return score >= 3 ? [currentStage, nextStage, followingStage] : [currentStage, nextStage]
}

function stageLabel(stageId: string): string {
  return STAGES.find((stage) => stage.id === stageId)?.label ?? stageId
}

function joinPhrases(parts: string[]): string {
  if (parts.length === 0) return "the selected assumptions differ from the baseline"
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`
}

function applicationScenarioId(applicationId: string, assumptions: ApplicationScenarioAssumptions): string {
  return [
    applicationId,
    assumptions.evidenceExpectedDays,
    assumptions.dependencyResolution,
    assumptions.applicantResponseSla,
    assumptions.planningEvidence,
    assumptions.landRightsEvidence,
    assumptions.reviewTurnaround,
  ].join("__")
}
