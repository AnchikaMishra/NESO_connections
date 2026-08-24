import { STAGES, type Tone } from "./track-data"

/* ------------------------------------------------------------------ *
 * Application level — drill into a single connection application.
 * Synthetic, illustrative data for the Track demo. Answers:
 *   Where is this application?  Why is it stuck?  What's blocking it?
 * ...and offers illustrative interventions to act on.
 * ------------------------------------------------------------------ */

export type Technology =
  | "Solar"
  | "Onshore wind"
  | "Offshore wind"
  | "Battery storage"
  | "Interconnector"
  | "Demand"
  | "Hybrid"

export type ConnectionType = "Demand" | "Generation" | "Storage" | "Interconnector" | "Hybrid"

/** Stable colours used for connection-type case tokens in the marble run. */
export const CONNECTION_TYPE_COLORS: Record<ConnectionType, string> = {
  Demand: "#2563EB",
  Generation: "#E0752C",
  Storage: "#138A72",
  Interconnector: "#7C3AED",
  Hybrid: "#C2417A",
}

export const CONNECTION_TYPES: ConnectionType[] = ["Generation", "Demand", "Storage", "Interconnector", "Hybrid"]
export type GenerationTechnology = "Solar" | "Onshore wind" | "Offshore wind"
export type CapacityBand = "Under 50 MW" | "50-250 MW" | "250 MW-1 GW" | "Over 1 GW"

export type CustomerType = "Developer" | "IDNO" | "Direct connect" | "Community"
export type Importance = "High" | "Medium" | "Low"
export type ApplicationCohort = "Legacy queue" | "Transition cohort" | "New applications"
export type Geography =
  | "Scotland"
  | "North East"
  | "North West"
  | "Midlands"
  | "East of England"
  | "South East"
  | "South West"

/** Current observed status of an application or recorded fallout case. */
export type AppStatus = "flowing" | "queued" | "stuck" | "at-risk" | "returned" | "withdrawn" | "rejected"
export type FocusLens = "all" | "blocked" | "long-dwell" | "returned-rework" | "actionable" | "fallout"
export type DwellBand = "Within target" | "1-30 days over" | "30+ days over"
export type YesNo = "Yes" | "No"

export const STATUS_META: Record<AppStatus, { label: string; tone: Tone }> = {
  flowing: { label: "Flowing", tone: "success" },
  queued: { label: "Queued", tone: "accent" },
  stuck: { label: "Stuck", tone: "danger" },
  "at-risk": { label: "At risk", tone: "warning" },
  returned: { label: "Returned", tone: "warning" },
  withdrawn: { label: "Withdrawn", tone: "danger" },
  rejected: { label: "Rejected", tone: "danger" },
}

export interface Blocker {
  label: string
  detail: string
  /** Owner responsible for clearing it. */
  owner: string
}

export interface Intervention {
  label: string
  /** Illustrative expected effect of taking this action. */
  effect: string
  /** The lever this pulls — recommended action is marked primary. */
  primary?: boolean
}

export interface Application {
  id: string
  reference: string
  name: string
  descriptor: string
  connectionType: ConnectionType
  technology: Technology
  capacityMw: number
  geography: Geography
  region: string
  cohort: ApplicationCohort
  customerType: CustomerType
  importance: Importance
  stageId: string
  status: AppStatus
  daysInStage: number
  targetDays: number
  /** Why the system is drawing attention to it (one-line). */
  summary: string
  blockers: Blocker[]
  interventions: Intervention[]
}

export const APPLICATIONS: Application[] = [
  {
    id: "meridian-data-campus",
    reference: "CON-2025-0147",
    name: "Meridian Data Campus",
    descriptor: "250 MW Demand",
    connectionType: "Demand",
    technology: "Demand",
    capacityMw: 250,
    geography: "East of England",
    region: "East of England · Zone B7",
    cohort: "Transition cohort",
    customerType: "Direct connect",
    importance: "High",
    stageId: "confirm-design",
    status: "stuck",
    daysInStage: 74,
    targetDays: 30,
    summary: "Currently blocked at design confirmation with two clarification loops and an outstanding reinforcement study.",
    blockers: [
      {
        label: "Awaiting connection design confirmation",
        detail: "Design option B requires a network reinforcement study that has not been scheduled.",
        owner: "TO design team",
      },
      {
        label: "Two open clarification loops",
        detail: "Load profile and metering assumptions returned to the customer twice for information.",
        owner: "Customer + Connections",
      },
      {
        label: "High system impact",
        detail: "Requested capacity influences queue positions of three nearby applications.",
        owner: "System planning",
      },
    ],
    interventions: [
      { label: "Expedite reinforcement study", effect: "Removes the primary blocker; est. −5 weeks in stage.", primary: true },
      { label: "Consolidate open clarifications", effect: "Single combined request closes both loops in one cycle." },
      { label: "Escalate to design review board", effect: "Prioritises design sign-off ahead of the queue." },
    ],
  },
  {
    id: "riverbend-solar",
    reference: "CON-2025-0213",
    name: "Riverbend Solar",
    descriptor: "40 MW Generation",
    connectionType: "Generation",
    technology: "Solar",
    capacityMw: 40,
    geography: "South West",
    region: "South West · Zone C2",
    cohort: "New applications",
    customerType: "Developer",
    importance: "Medium",
    stageId: "confirm-design",
    status: "queued",
    daysInStage: 21,
    targetDays: 30,
    summary: "Currently waiting for a standard-design reviewer at the design-confirmation bottleneck.",
    blockers: [
      {
        label: "Standard design pending queue",
        detail: "Uses a standard design template — only needs a reviewer assigned.",
        owner: "Connections",
      },
    ],
    interventions: [
      { label: "Assign standard-design reviewer", effect: "Clears the stage immediately; frees one bottleneck slot.", primary: true },
      { label: "Batch with similar solar designs", effect: "Groups 4 comparable designs into one review pass." },
    ],
  },
  {
    id: "north-fen-wind",
    reference: "CON-2024-0386",
    name: "North Fen Wind",
    descriptor: "180 MW Onshore wind",
    connectionType: "Generation",
    technology: "Onshore wind",
    capacityMw: 180,
    geography: "Scotland",
    region: "Scotland · Zone A1",
    cohort: "Legacy queue",
    customerType: "Developer",
    importance: "High",
    stageId: "confirm-design",
    status: "at-risk",
    daysInStage: 58,
    targetDays: 30,
    summary: "A current planning condition expires in six weeks while the application remains in design confirmation.",
    blockers: [
      {
        label: "Planning condition expiry",
        detail: "Consent condition 7 lapses in 6 weeks; design unlikely to complete in time.",
        owner: "Customer",
      },
      {
        label: "Reinforcement dependency",
        detail: "Shares a reinforcement study with Meridian Data Campus.",
        owner: "TO design team",
      },
    ],
    interventions: [
      { label: "Request planning extension", effect: "Protects the application from lapsing while in queue.", primary: true },
      { label: "Co-study with North Fen", effect: "Shared reinforcement study clears two applications at once." },
    ],
  },
  {
    id: "eastport-interconnector",
    reference: "CON-2024-0062",
    name: "Eastport Interconnector",
    descriptor: "1.2 GW Interconnector",
    connectionType: "Interconnector",
    technology: "Interconnector",
    capacityMw: 1200,
    geography: "South East",
    region: "South East · Zone D4",
    cohort: "Legacy queue",
    customerType: "Direct connect",
    importance: "High",
    stageId: "system-studies",
    status: "stuck",
    daysInStage: 66,
    targetDays: 45,
    summary: "Complex system studies are extending well beyond target with a re-study loop open.",
    blockers: [
      {
        label: "Re-study triggered",
        detail: "Fault-level results exceeded thresholds; studies returned to TO design.",
        owner: "System planning",
      },
    ],
    interventions: [
      { label: "Add specialist study resource", effect: "Shortens the re-study cycle; est. −3 weeks.", primary: true },
      { label: "Stagger with adjacent studies", effect: "Sequences shared boundary studies to avoid rework." },
    ],
  },
  {
    id: "clyde-battery",
    reference: "CON-2025-0189",
    name: "Clyde Battery Park",
    descriptor: "90 MW Battery storage",
    connectionType: "Storage",
    technology: "Battery storage",
    capacityMw: 90,
    geography: "Scotland",
    region: "Scotland · Zone A3",
    cohort: "Transition cohort",
    customerType: "Developer",
    importance: "Medium",
    stageId: "gate2-readiness",
    status: "returned",
    daysInStage: 33,
    targetDays: 21,
    summary: "Returned from the Gate 2 readiness check for missing evidence.",
    blockers: [
      {
        label: "Incomplete readiness evidence",
        detail: "Land rights confirmation and updated single-line diagram outstanding.",
        owner: "Customer",
      },
    ],
    interventions: [
      { label: "Issue combined evidence request", effect: "Lists all outstanding items in one clear ask.", primary: true },
      { label: "Offer a readiness clinic", effect: "Guided session helps the customer submit correctly first time." },
    ],
  },
  {
    id: "harbour-demand",
    reference: "CON-2026-0028",
    name: "Harbour Quarter Demand",
    descriptor: "120 MW Demand",
    connectionType: "Demand",
    technology: "Demand",
    capacityMw: 120,
    geography: "North West",
    region: "North West · Zone C7",
    cohort: "New applications",
    customerType: "IDNO",
    importance: "Medium",
    stageId: "planning-consent",
    status: "flowing",
    daysInStage: 40,
    targetDays: 90,
    summary: "Progressing on track through planning — no action required.",
    blockers: [],
    interventions: [{ label: "Continue monitoring", effect: "No intervention needed; on track for its window.", primary: true }],
  },
  {
    id: "greenmoor-hybrid",
    reference: "CON-2026-0041",
    name: "Greenmoor Hybrid",
    descriptor: "60 MW Solar + Battery",
    connectionType: "Hybrid",
    technology: "Hybrid",
    capacityMw: 60,
    geography: "Midlands",
    region: "Midlands · Zone B2",
    cohort: "New applications",
    customerType: "Community",
    importance: "Low",
    stageId: "gate1-assessment",
    status: "returned",
    daysInStage: 18,
    targetDays: 14,
    summary: "Returned for information during Gate 1 assessment.",
    blockers: [
      {
        label: "Clarification on hybrid metering",
        detail: "Import/export split for the co-located battery needs confirming.",
        owner: "Customer",
      },
    ],
    interventions: [
      { label: "Provide a worked metering example", effect: "Helps the community group respond quickly and correctly.", primary: true },
    ],
  },
  {
    id: "seaton-offshore",
    reference: "CON-2025-0094",
    name: "Seaton Offshore",
    descriptor: "800 MW Offshore wind",
    connectionType: "Generation",
    technology: "Offshore wind",
    capacityMw: 800,
    geography: "North East",
    region: "North East · Zone A6",
    cohort: "Transition cohort",
    customerType: "Developer",
    importance: "High",
    stageId: "gate2-assessment",
    status: "flowing",
    daysInStage: 12,
    targetDays: 30,
    summary: "Strategic project moving well through Gate 2 assessment.",
    blockers: [],
    interventions: [{ label: "Continue monitoring", effect: "On track; flag if fault-level studies slip.", primary: true }],
  },
  {
    id: "willow-solar",
    reference: "CON-2024-0412",
    name: "Willow Farm Solar",
    descriptor: "25 MW Generation",
    connectionType: "Generation",
    technology: "Solar",
    capacityMw: 25,
    geography: "South West",
    region: "South West · Zone C1",
    cohort: "Legacy queue",
    customerType: "Developer",
    importance: "Low",
    stageId: "land-rights",
    status: "at-risk",
    daysInStage: 96,
    targetDays: 60,
    summary: "Land negotiations are above the current stage target and a third-party easement remains unresolved.",
    blockers: [
      {
        label: "Stalled land negotiation",
        detail: "Third-party easement unresolved for over three months.",
        owner: "Customer",
      },
    ],
    interventions: [
      { label: "Offer land-rights guidance", effect: "Signposts routes to resolve the easement and avoid drop-out.", primary: true },
    ],
  },
  {
    id: "pennine-battery",
    reference: "CON-2025-0257",
    name: "Pennine Battery",
    descriptor: "150 MW Battery storage",
    connectionType: "Storage",
    technology: "Battery storage",
    capacityMw: 150,
    geography: "North West",
    region: "North West · Zone C6",
    cohort: "Transition cohort",
    customerType: "Developer",
    importance: "Medium",
    stageId: "to-design",
    status: "queued",
    daysInStage: 15,
    targetDays: 30,
    summary: "Waiting in the TO design queue behind the bottleneck.",
    blockers: [
      {
        label: "Design capacity constrained",
        detail: "TO design team throughput limited by the upstream bottleneck.",
        owner: "TO design team",
      },
    ],
    interventions: [
      { label: "Rebalance design workload", effect: "Redistributes standard designs to free specialist capacity.", primary: true },
    ],
  },
  {
    id: "fenland-solar",
    reference: "CON-2026-0063",
    name: "Fenland Solar",
    descriptor: "35 MW Generation",
    connectionType: "Generation",
    technology: "Solar",
    capacityMw: 35,
    geography: "East of England",
    region: "East of England · Zone B8",
    cohort: "New applications",
    customerType: "Developer",
    importance: "Low",
    stageId: "gate1-offer",
    status: "flowing",
    daysInStage: 8,
    targetDays: 21,
    summary: "Gate 1 offer progressing normally.",
    blockers: [],
    interventions: [{ label: "Continue monitoring", effect: "No action needed.", primary: true }],
  },
  {
    id: "dockside-demand",
    reference: "CON-2024-0178",
    name: "Dockside Demand",
    descriptor: "300 MW Demand",
    connectionType: "Demand",
    technology: "Demand",
    capacityMw: 300,
    geography: "South East",
    region: "South East · Zone D2",
    cohort: "Legacy queue",
    customerType: "Direct connect",
    importance: "High",
    stageId: "offer-issued",
    status: "flowing",
    daysInStage: 5,
    targetDays: 30,
    summary: "Offer issued and awaiting customer acceptance.",
    blockers: [],
    interventions: [{ label: "Continue monitoring", effect: "On track for acceptance.", primary: true }],
  },
  {
    id: "moorland-wind-withdrawal",
    reference: "CON-2024-0291",
    name: "Moorland Wind Extension",
    descriptor: "75 MW Generation",
    connectionType: "Generation",
    technology: "Onshore wind",
    capacityMw: 75,
    geography: "North East",
    region: "North East · Zone A4",
    cohort: "Legacy queue",
    customerType: "Developer",
    importance: "Medium",
    stageId: "land-rights",
    status: "withdrawn",
    daysInStage: 112,
    targetDays: 60,
    summary: "Withdrawal is recorded after the land-rights route could not be completed.",
    blockers: [],
    interventions: [{ label: "Open case record", effect: "Review the recorded withdrawal information." }],
  },
  {
    id: "coastal-storage-rejection",
    reference: "CON-2025-0314",
    name: "Coastal Storage Project",
    descriptor: "200 MW Storage",
    connectionType: "Storage",
    technology: "Battery storage",
    capacityMw: 200,
    geography: "South East",
    region: "South East · Zone D5",
    cohort: "Transition cohort",
    customerType: "Developer",
    importance: "Medium",
    stageId: "gate2-assessment",
    status: "rejected",
    daysInStage: 41,
    targetDays: 30,
    summary: "Rejection is recorded following the current Gate 2 evidence assessment.",
    blockers: [],
    interventions: [{ label: "Open case record", effect: "Review the recorded assessment decision." }],
  },
]

export interface ApplicationFilters {
  connectionType: "All" | ConnectionType
  generationTechnology: "All" | GenerationTechnology
  capacityBand: "All" | CapacityBand
  geography: "All" | Geography
  cohort: "All" | ApplicationCohort
  importance: "All" | Importance
  customerType: "All" | CustomerType
  status: "All" | AppStatus
  currentStage: string
  owningTeam: string
  dwellBand: "All" | DwellBand
  returnedRework: "All" | YesNo
  hasBlocker: "All" | YesNo
}

export const DEFAULT_APPLICATION_FILTERS: ApplicationFilters = {
  connectionType: "All",
  generationTechnology: "All",
  capacityBand: "All",
  geography: "All",
  cohort: "All",
  importance: "All",
  customerType: "All",
  status: "All",
  currentStage: "All",
  owningTeam: "All",
  dwellBand: "All",
  returnedRework: "All",
  hasBlocker: "All",
}

const unique = <T extends string>(values: T[]) => [...new Set(values)].sort() as T[]

export const APPLICATION_FILTER_OPTIONS = {
  connectionType: ["Demand", "Generation", "Storage", "Interconnector", "Hybrid"] as ConnectionType[],
  generationTechnology: ["Solar", "Onshore wind", "Offshore wind"] as GenerationTechnology[],
  capacityBand: ["Under 50 MW", "50-250 MW", "250 MW-1 GW", "Over 1 GW"] as CapacityBand[],
  geography: unique(APPLICATIONS.map((app) => app.geography)),
  cohort: ["Legacy queue", "Transition cohort", "New applications"] as ApplicationCohort[],
  importance: ["High", "Medium", "Low"] as Importance[],
  customerType: unique(APPLICATIONS.map((app) => app.customerType)),
  status: ["stuck", "at-risk", "returned", "queued", "flowing"] as AppStatus[],
  currentStage: STAGES.map((stage) => ({ value: stage.id, label: stage.label })),
  owningTeam: unique(APPLICATIONS.flatMap((app) => app.blockers.map((blocker) => blocker.owner)).concat("Connections")),
  dwellBand: ["Within target", "1-30 days over", "30+ days over"] as DwellBand[],
  yesNo: ["Yes", "No"] as YesNo[],
}

export function applicationMatchesFilters(app: Application, filters: ApplicationFilters): boolean {
  return (
    (filters.connectionType === "All" || app.connectionType === filters.connectionType) &&
    (filters.generationTechnology === "All" ||
      (app.connectionType === "Generation" && app.technology === filters.generationTechnology)) &&
    (filters.capacityBand === "All" || capacityInBand(app.capacityMw, filters.capacityBand)) &&
    (filters.geography === "All" || app.geography === filters.geography) &&
    (filters.cohort === "All" || app.cohort === filters.cohort) &&
    (filters.importance === "All" || app.importance === filters.importance) &&
    (filters.customerType === "All" || app.customerType === filters.customerType) &&
    (filters.status === "All" || app.status === filters.status) &&
    (filters.currentStage === "All" || app.stageId === filters.currentStage) &&
    (filters.owningTeam === "All" ||
      (filters.owningTeam === "Connections"
        ? app.blockers.length === 0
        : app.blockers.some((blocker) => blocker.owner === filters.owningTeam))) &&
    (filters.dwellBand === "All" || dwellBandFor(app) === filters.dwellBand) &&
    (filters.returnedRework === "All" || (isReturnedOrRework(app) ? "Yes" : "No") === filters.returnedRework) &&
    (filters.hasBlocker === "All" || (app.blockers.length > 0 ? "Yes" : "No") === filters.hasBlocker)
  )
}

export function isFallout(app: Application): boolean {
  return app.status === "withdrawn" || app.status === "rejected"
}

export function isReturnedOrRework(app: Application): boolean {
  if (app.status === "returned") return true
  return app.blockers.some((blocker) => /return|rework|re-study|clarification/i.test(`${blocker.label} ${blocker.detail}`))
}

export function applicationOwner(app: Application): string {
  return app.blockers[0]?.owner ?? "Connections"
}

export function dwellBandFor(app: Application): DwellBand {
  const daysOver = app.daysInStage - app.targetDays
  if (daysOver <= 0) return "Within target"
  return daysOver <= 30 ? "1-30 days over" : "30+ days over"
}

export function applicationMatchesFocus(app: Application, focus: FocusLens): boolean {
  if (focus === "fallout") return isFallout(app)
  if (isFallout(app)) return false
  if (focus === "blocked") return app.blockers.length > 0 || app.status === "stuck"
  if (focus === "long-dwell") return app.daysInStage > app.targetDays
  if (focus === "returned-rework") return isReturnedOrRework(app)
  if (focus === "actionable") return app.blockers.length > 0 && applicationOwner(app).length > 0
  return true
}

export function capacityInBand(capacityMw: number, band: CapacityBand): boolean {
  if (band === "Under 50 MW") return capacityMw < 50
  if (band === "50-250 MW") return capacityMw >= 50 && capacityMw <= 250
  if (band === "250 MW-1 GW") return capacityMw > 250 && capacityMw <= 1000
  return capacityMw > 1000
}

export function formatCapacity(capacityMw: number): string {
  if (capacityMw < 1000) return `${capacityMw} MW`
  const capacityGw = capacityMw / 1000
  return `${Number.isInteger(capacityGw) ? capacityGw : capacityGw.toFixed(1)} GW`
}

export function filterApplications(filters: ApplicationFilters, focus: FocusLens = "all"): Application[] {
  return APPLICATIONS.filter((app) => applicationMatchesFilters(app, filters) && applicationMatchesFocus(app, focus))
}

export function activeFilterCount(filters: ApplicationFilters): number {
  return Object.values(filters).filter((value) => value !== "All").length
}

/** Scale aggregate demo figures by the matching share of sampled applications. */
export function filteredPortfolioScale(filters: ApplicationFilters, focus: FocusLens = "all"): number {
  const activeSampleSize = APPLICATIONS.filter((app) => !isFallout(app)).length
  return filterApplications(filters, focus).length / activeSampleSize
}

/** Applications currently sitting at a given stage. */
export function applicationsAtStage(
  stageId: string,
  filters: ApplicationFilters = DEFAULT_APPLICATION_FILTERS,
  focus: FocusLens = "all",
): Application[] {
  return APPLICATIONS.filter(
    (app) => app.stageId === stageId && applicationMatchesFilters(app, filters) && applicationMatchesFocus(app, focus),
  )
}

export function getApplication(id: string): Application | undefined {
  return APPLICATIONS.find((a) => a.id === id)
}

/** Zero-based position of a stage in the 15-stage journey. */
export function stageIndexOf(stageId: string): number {
  return STAGES.findIndex((s) => s.id === stageId)
}
