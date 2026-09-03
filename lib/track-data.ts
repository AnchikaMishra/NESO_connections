import type { LucideIcon } from "lucide-react"
import { LogOut, RotateCcw, TriangleAlert, Users } from "lucide-react"

/* ------------------------------------------------------------------ *
 * Connections Flow Intelligence — TRACK (system-level view)
 * All figures are illustrative synthetic journey data + model outputs.
 * The four-key structure below lets the UI tell a "without action vs.
 * after action" narrative when presenting to the NESO client.
 * ------------------------------------------------------------------ */

export type Timeframe = "today" | "month1" | "month6" | "afterActions"

export interface TimeValue {
  today: number
  month1: number
  month6: number
  afterActions: number
}

export const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "month1", label: "+1 month" },
  { id: "month6", label: "+6 months" },
  { id: "afterActions", label: "With operational changes" },
]

/** The first three timeframes form a "do nothing" forecast; the last is a scenario. */
export const FORECAST_TIMEFRAMES: Timeframe[] = ["today", "month1", "month6"]
export const SCENARIO_TIMEFRAME: Timeframe = "afterActions"

/** One-line explanation of exactly what each view represents. */
export const TIMEFRAME_CAPTION: Record<Timeframe, string> = {
  today: "Live position today — cases currently sitting at each stage.",
  month1: "Projected in 1 month if nothing changes.",
  month6: "Projected in 6 months if nothing changes — the bottleneck grows.",
  afterActions:
    "Illustrative 6-month outcome with targeted operational changes across accountable teams.",
}

export type StageKind = "normal" | "bottleneck" | "energised"
export type FlowMode = "simple" | "complex"

export interface Stage {
  id: string
  label: string
  counts: TimeValue
  kind: StageKind
}

/** Primary Gate 2 journey agreed with the embedded Connections team. */
export const STAGES: Stage[] = [
  { id: "application-received", label: "Application received", kind: "normal", counts: { today: 128, month1: 136, month6: 154, afterActions: 140 } },
  { id: "gate2-readiness", label: "Gate 2 Readiness Checks", kind: "normal", counts: { today: 126, month1: 130, month6: 138, afterActions: 132 } },
  { id: "strategic-alignment", label: "Strategic Alignment Assessment", kind: "normal", counts: { today: 105, month1: 106, month6: 112, afterActions: 110 } },
  { id: "gated-outcome", label: "Gated Outcome", kind: "normal", counts: { today: 94, month1: 96, month6: 101, afterActions: 100 } },
  { id: "gate2", label: "Gate 2", kind: "normal", counts: { today: 93, month1: 95, month6: 99, afterActions: 98 } },
  { id: "system-design", label: "System Design", kind: "normal", counts: { today: 77, month1: 81, month6: 88, afterActions: 84 } },
  { id: "to-design", label: "TO Design", kind: "bottleneck", counts: { today: 70, month1: 77, month6: 91, afterActions: 38 } },
  { id: "offer-issued", label: "Issue Offers", kind: "normal", counts: { today: 42, month1: 55, month6: 76, afterActions: 49 } },
  { id: "securities-received", label: "Securities Received", kind: "normal", counts: { today: 39, month1: 40, month6: 45, afterActions: 46 } },
  { id: "milestone-management", label: "Milestone Management", kind: "normal", counts: { today: 36, month1: 37, month6: 40, afterActions: 42 } },
  { id: "connected", label: "Connected", kind: "energised", counts: { today: 30, month1: 32, month6: 36, afterActions: 40 } },
]

/** Compact rows preserve the established marble-run layout. */
export const STAGE_ROWS: Stage[][] = [
  STAGES.slice(0, 4),
  STAGES.slice(4, 8),
  STAGES.slice(8, 11),
]

/* ------------------------------------------------------------------ *
 * Complex-flow view: clarification / rework cycles + forecast pressure
 * ------------------------------------------------------------------ */

/**
 * A clarification cycle is a share of cases that loop backward to an earlier
 * stage (returned for information, re-study, design rework). Rendered as an
 * arc above a row, from `fromCol` back to `toCol` within that STAGE_ROWS row.
 */
export interface ClarificationLoop {
  id: string
  row: number
  fromCol: number
  toCol: number
  label: string
}

export const CLARIFICATION_LOOPS: ClarificationLoop[] = [
  // Readiness and strategic-alignment checks can return applications for more information.
  { id: "readiness-resubmit", row: 0, fromCol: 1, toCol: 0, label: "Readiness resubmission" },
  { id: "alignment-return", row: 0, fromCol: 2, toCol: 1, label: "Returned for checks" },
  { id: "gated-return", row: 0, fromCol: 3, toCol: 1, label: "Gate 1 / resubmission" },
  // System and TO design can loop when technical assumptions change.
  { id: "design-rework", row: 1, fromCol: 2, toCol: 1, label: "Design rework" },
  { id: "offer-clarification", row: 1, fromCol: 3, toCol: 2, label: "Offer clarification" },
]

/** Baseline congestion by timeframe — grows toward +6 months, cools after action. */
const TIMEFRAME_PRESSURE: Record<Timeframe, number> = {
  today: 0.15,
  month1: 0.4,
  month6: 0.75,
  afterActions: 0.05,
}

/** Stages that sit in or feed the bottleneck carry extra pressure. */
const HIGH_PRESSURE_STAGES = new Set(["gate2-readiness", "system-design", "offer-issued"])

/**
 * Congestion for a stage at a given timeframe, 0 (free-flowing, orange) → 1
 * (stalled, red). Drives the orange→red colour of case dots and connectors.
 */
export function stagePressure(stage: Stage, timeframe: Timeframe): number {
  let p = TIMEFRAME_PRESSURE[timeframe]
  if (stage.kind === "bottleneck") p += 0.45
  else if (HIGH_PRESSURE_STAGES.has(stage.id)) p += 0.2
  if (stage.kind === "energised") p = Math.min(p, 0.08)
  return Math.max(0, Math.min(1, p))
}

/* ------------------------------------------------------------------ *
 * Continuous forecast axis (0 → 6 months) for the marble-run playhead
 * ------------------------------------------------------------------ */

export const MONTH_MAX = 6

function bracket(month: number): [Timeframe, Timeframe, number] {
  const m = Math.max(0, Math.min(MONTH_MAX, month))
  if (m <= 1) return ["today", "month1", m / 1]
  return ["month1", "month6", (m - 1) / 5]
}

const lerp = (a: number, b: number, f: number) => a + (b - a) * f

/** Interpolated baseline count for a stage at a continuous month position. */
export function interpStageCount(stage: Stage, month: number): number {
  const [a, b, f] = bracket(month)
  return lerp(stage.counts[a], stage.counts[b], f)
}

/** Interpolated congestion (0..1) for a stage at a continuous month position. */
export function interpPressure(stage: Stage, month: number): number {
  const [a, b, f] = bracket(month)
  return lerp(stagePressure(stage, a), stagePressure(stage, b), f)
}

/** Inflow interval (ms) — slightly faster inflow as the queue ages. */
export function spawnForMonth(month: number): number {
  return 400 - Math.max(0, Math.min(MONTH_MAX, month)) * 8
}

/** Human label for a month position, e.g. "Now", "+1 month", "+3.5 months". */
export function monthLabel(month: number): string {
  if (month < 0.25) return "Now"
  const r = Math.round(month * 2) / 2
  return `+${r % 1 === 0 ? r : r.toFixed(1)} month${r === 1 ? "" : "s"}`
}

/** Nearest discrete timeframe — used to drive the KPI cards and insight rail. */
export function nearestTimeframe(month: number): Timeframe {
  return month < 0.5 ? "today" : month < 3.5 ? "month1" : "month6"
}

/* ------------------------------------------------------------------ *
 * Fallout / drop-out — cases that exit the system (withdrawn / rejected)
 * ------------------------------------------------------------------ */

export interface ExitPoint {
  stageId: string
  kind: "withdrawn" | "rejected"
  baseRate: number
}

export const EXIT_POINTS: ExitPoint[] = [
  { stageId: "gated-outcome", kind: "rejected", baseRate: 0.04 },
  { stageId: "offer-issued", kind: "withdrawn", baseRate: 0.03 },
  { stageId: "milestone-management", kind: "withdrawn", baseRate: 0.02 },
]

/* ------------------------------------------------------------------ *
 * Live diagnostics — the marble-run "sense" layer read-outs
 * ------------------------------------------------------------------ */

export interface Diagnostics {
  bottleneck: { stageId: string; label: string; queue: number }
  growing: { stageId: string; label: string; delta: number } | null
  rework: { stageId: string; label: string; count: number }
  fallout: { lost: number; rate: number }
  delay: { stageId: string; label: string; days: number }
}

export type Tone = "accent" | "warning" | "danger" | "success" | "primary"

export interface Kpi {
  id: string
  label: string
  icon: LucideIcon
  tone: Tone
  values: TimeValue
  info: string
}

export const KPIS: Kpi[] = [
  {
    id: "active",
    label: "Active applications",
    icon: Users,
    tone: "accent",
    values: { today: 128, month1: 136, month6: 154, afterActions: 140 },
    info: "Total live connection applications currently in the journey.",
  },
  {
    id: "bottleneck-queue",
    label: "Current bottleneck queue",
    icon: TriangleAlert,
    tone: "warning",
    values: { today: 70, month1: 77, month6: 91, afterActions: 38 },
    info: "Applications currently represented at the most constrained stage.",
  },
  {
    id: "returns-rework",
    label: "Returns / rework",
    icon: RotateCcw,
    tone: "accent",
    values: { today: 18, month1: 20, month6: 25, afterActions: 8 },
    info: "Applications currently in a return, clarification, re-study or rework cycle.",
  },
  {
    id: "fallout",
    label: "Withdrawn / fallout",
    icon: LogOut,
    tone: "danger",
    values: { today: 7, month1: 9, month6: 12, afterActions: 4 },
    info: "Applications currently recorded as withdrawn, rejected or otherwise outside the active journey.",
  },
]

/* ---- Right-hand insight rail ---------------------------------------- */

export const BOTTLENECK_STAGE_ID = "to-design"

export const BOTTLENECK_MESSAGE: Record<Timeframe, { text: string; tone: Tone }> = {
  today: { text: "Elevated wait time and cycle risk", tone: "danger" },
  month1: { text: "Queue building — cycle-time risk rising", tone: "danger" },
  month6: { text: "Severe backlog projected without intervention", tone: "danger" },
  afterActions: { text: "Bottleneck easing after targeted actions", tone: "success" },
}

export interface FeaturedCase {
  id: string
  name: string
  descriptor: string
  icon: LucideIcon
  tags: { label: string; tone: "danger" | "warning" | "violet" | "accent" | "anticipate" }[]
  note: string
}

export const FEATURED_URGENT: FeaturedCase = {
  id: "meridian-data-campus",
  name: "Meridian Data Campus",
  descriptor: "250 MW Demand",
  icon: Users, // replaced in component with a building icon
  tags: [
    { label: "Urgent", tone: "danger" },
    { label: "Next-window risk", tone: "warning" },
    { label: "System impact", tone: "violet" },
  ],
  note: "At risk of missing the next relevant window.",
}

export const FEATURED_QUICK_WIN: FeaturedCase = {
  id: "riverbend-solar",
  name: "Riverbend Solar",
  descriptor: "40 MW Generation",
  icon: Users, // replaced in component with a sun icon
  tags: [
    { label: "Quick win", tone: "accent" },
    { label: "Bottleneck relief", tone: "anticipate" },
  ],
  note: "Action could ease the current bottleneck.",
}

export const TRUST_NOTE =
  "This Release 1 view uses illustrative deterministic current-state journey data. It does not forecast outcomes or optimise interventions."

export const TALK_TRACK =
  "We start at system level to see where applications are flowing, stalling, or building up. The system then focuses attention on the cases where targeted action could improve both the customer journey and overall portfolio flow."

export const CLICK_NEXT = "Open Meridian Data Campus from Next-window risk."

export type AvailableRelease = "track" | "predict" | "simulate"

export const NAV_TABS = [
  { id: "track", label: "Track", release: "R1", status: "available" },
  { id: "predict", label: "Predict", release: "R2", status: "available" },
  { id: "simulate", label: "Simulate", release: "R3", status: "available" },
  { id: "act", label: "Act", release: "R4", status: "planned" },
] as const
