"use client"

import { useEffect, useState } from "react"
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CircleCheck,
  ExternalLink,
  Eye,
  FileCheck2,
  Gauge,
  History,
  Layers3,
  MapPin,
  Route,
  ShieldAlert,
  Users,
  Wrench,
  Zap,
} from "lucide-react"
import { STAGES } from "@/lib/track-data"
import { STATUS_META, applicationOwner, formatCapacity, stageIndexOf, type Application } from "@/lib/applications"
import { TONE_BADGE } from "@/lib/track-ui"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface ApplicationDialogProps {
  application: Application | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onBack?: () => void
}

type ApplicationView = "insight" | "action"

const IMPORTANCE_TONE = { High: "danger", Medium: "warning", Low: "accent" } as const

export function ApplicationDialog({ application, open, onOpenChange, onBack }: ApplicationDialogProps) {
  const [view, setView] = useState<ApplicationView>("insight")
  const [selectedAction, setSelectedAction] = useState<string | null>(null)

  useEffect(() => {
    setView("insight")
    setSelectedAction(null)
  }, [application?.id, open])

  if (!application) return null
  const app = application
  const status = STATUS_META[app.status]
  const index = stageIndexOf(app.stageId)
  const stage = STAGES[index]
  const overdue = app.daysInStage > app.targetDays
  const percentThrough = Math.round(((index + 1) / STAGES.length) * 100)
  const owner = applicationOwner(app)
  const history = buildCurrentHistory(app, index)
  const actions = buildCurrentActions(app, owner)

  const facts = [
    { icon: Zap, label: "Connection type", value: app.connectionType },
    { icon: Gauge, label: "Connection capacity", value: formatCapacity(app.capacityMw) },
    ...(app.connectionType === "Generation" ? [{ icon: Zap, label: "Technology", value: app.technology }] : []),
    { icon: MapPin, label: "Geography", value: app.region },
    { icon: Layers3, label: "Cohort", value: app.cohort },
    { icon: Users, label: "Customer", value: app.customerType },
    { icon: ShieldAlert, label: "Importance", value: app.importance },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        {onBack && (
          <button type="button" onClick={onBack} className="-mt-1 flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to stage
          </button>
        )}

        <div className="flex items-start gap-3 pr-8">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.68rem] font-bold uppercase text-accent">
              Current application record · <span className="font-mono">{app.reference}</span>
            </p>
            <DialogTitle>{app.name}</DialogTitle>
            <DialogDescription className="mt-1">{app.descriptor} · {app.summary}</DialogDescription>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className={cn("rounded px-2 py-0.5 text-[0.7rem] font-semibold", TONE_BADGE[status.tone])}>{status.label}</span>
              <span className={cn("rounded px-2 py-0.5 text-[0.7rem] font-medium", TONE_BADGE[IMPORTANCE_TONE[app.importance]])}>{app.importance} importance</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-border" aria-label="Application view">
          <button
            type="button"
            onClick={() => setView("insight")}
            aria-pressed={view === "insight"}
            className={cn("flex h-11 items-center justify-center gap-2 border-b-2 text-sm font-semibold transition-colors", view === "insight" ? "border-accent text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            Application Insight
          </button>
          <button
            type="button"
            onClick={() => setView("action")}
            aria-pressed={view === "action"}
            className={cn("flex h-11 items-center justify-center gap-2 border-b-2 text-sm font-semibold transition-colors", view === "action" ? "border-accent text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            <Wrench className="h-4 w-4" aria-hidden="true" />
            Application Action
          </button>
        </div>

        {view === "insight" ? (
          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-2 gap-x-5 gap-y-4 md:grid-cols-4">
              {facts.map((fact) => (
                <div key={fact.label} className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase text-muted-foreground">
                    <fact.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {fact.label}
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">{fact.value}</dd>
                </div>
              ))}
            </dl>

            <section className="border-t border-border pt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-[0.68rem] font-bold uppercase text-accent">Where is it now?</p>
                  <h3 className="text-sm font-semibold text-foreground">{stage.label}</h3>
                </div>
                <p className="text-xs text-muted-foreground">Stage {index + 1} of {STAGES.length} · {percentThrough}% through the primary journey</p>
              </div>
              <div className="mt-3 flex items-center gap-[3px]" aria-hidden="true">
                {STAGES.map((journeyStage, journeyIndex) => (
                  <span
                    key={journeyStage.id}
                    className={cn(
                      "h-2 flex-1 rounded-full",
                      journeyIndex < index && "bg-primary/40",
                      journeyIndex === index && (overdue ? "bg-danger" : "bg-accent"),
                      journeyIndex > index && "bg-secondary",
                    )}
                  />
                ))}
              </div>
            </section>

            <section className="flex items-center gap-3 border-y border-border py-3">
              <CalendarClock className={cn("h-5 w-5 shrink-0", overdue ? "text-danger" : "text-accent")} aria-hidden="true" />
              <p className="text-sm">
                <span className={cn("font-semibold", overdue ? "text-danger" : "text-foreground")}>{app.daysInStage} days in current stage</span>{" "}
                <span className="text-muted-foreground">against a {app.targetDays}-day benchmark{overdue ? ` · ${app.daysInStage - app.targetDays} days above` : " · within benchmark"}</span>
              </p>
            </section>

            <section>
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-accent" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">What has happened so far?</h3>
              </div>
              <ol className="mt-2 border-l border-border pl-4">
                {history.map((event) => (
                  <li key={`${event.label}-${event.detail}`} className="relative pb-3 last:pb-0">
                    <span className="absolute -left-[1.18rem] top-1.5 h-2 w-2 rounded-full border border-accent bg-card" aria-hidden="true" />
                    <p className="text-xs font-semibold text-foreground">{event.label}</p>
                    <p className="text-xs text-muted-foreground">{event.detail}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <p className="text-[0.68rem] font-bold uppercase text-accent">What is preventing progression now?</p>
              {app.blockers.length ? (
                <ul className="mt-2 divide-y divide-border border-y border-border">
                  {app.blockers.map((blocker) => (
                    <li key={blocker.label} className="grid gap-1 py-3 md:grid-cols-[1fr_160px] md:gap-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{blocker.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{blocker.detail}</p>
                      </div>
                      <p className="text-xs text-muted-foreground md:text-right">Current owner: <span className="font-semibold text-foreground">{blocker.owner}</span></p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 border-y border-success/25 py-3 text-sm text-success">No current blocker is recorded for this application.</p>
              )}
            </section>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="border-l-2 border-primary pl-3">
              <p className="text-[0.68rem] font-bold uppercase text-accent">Current operational actions</p>
              <p className="mt-1 text-sm text-muted-foreground">Review the current record, blocker evidence and accountable team. These prototype actions do not change the source record.</p>
            </div>

            <section>
              <h3 className="text-sm font-semibold text-foreground">Available case actions</h3>
              <div className="mt-2 divide-y divide-border border-y border-border">
                {actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => setSelectedAction(action.label)}
                    className={cn("flex w-full items-start gap-3 py-3 text-left transition-colors hover:bg-secondary/50", selectedAction === action.label && "bg-accent/5")}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <action.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">{action.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{action.detail}</span>
                    </span>
                    {selectedAction === action.label && <CircleCheck className="mt-1 h-4 w-4 text-success" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </section>

            {selectedAction && (
              <div className="flex items-start gap-3 border border-success/30 bg-success-muted/40 p-3 text-sm">
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-foreground">Prototype action selected</p>
                  <p className="text-xs text-muted-foreground">{selectedAction} is ready for demonstration. No operational system is changed.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function buildCurrentHistory(app: Application, index: number) {
  const events = [
    { label: "Application received", detail: "Application entered the recorded Connections journey." },
  ]
  if (index > 0) events.push({ label: "Gate 2 Readiness Checks", detail: "Initial and detailed readiness checks are recorded in the journey." })
  if (app.status === "returned") events.push({ label: "Returned for information", detail: "The current record contains a return or clarification cycle." })
  if (app.blockers.some((blocker) => /rework|re-study/i.test(`${blocker.label} ${blocker.detail}`))) {
    events.push({ label: "Rework recorded", detail: "A current rework or re-study route is recorded on the application." })
  }
  events.push({ label: STAGES[index].label, detail: `${app.daysInStage} days recorded at the current stage.` })
  return events
}

function buildCurrentActions(app: Application, owner: string) {
  const actions: Array<{ label: string; detail: string; icon: typeof FileCheck2 }> = []
  if (app.blockers.length > 0) actions.push({ label: "Review evidence", detail: "Open the evidence and information currently recorded against the blocker.", icon: FileCheck2 })
  if (app.blockers.length > 0) actions.push({ label: "Review current blocker", detail: `${app.blockers.length} current blocker${app.blockers.length === 1 ? " is" : "s are"} recorded on this application.`, icon: ShieldAlert })
  actions.push({ label: `Route to ${owner}`, detail: "Send the current record to the accountable team for operational review.", icon: Route })
  actions.push({ label: "Open case record", detail: "Open the source application record and supporting current information.", icon: ExternalLink })
  return actions
}
