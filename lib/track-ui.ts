import type { Tone } from "./track-data"

/**
 * Interpolates queue-orange → danger-red by congestion (0..1). Used to colour
 * the moving case dots and connectors in the complex-flow forecast.
 */
export function pressureColor(pressure: number): string {
  const pct = Math.round(Math.max(0, Math.min(1, pressure)) * 100)
  return `color-mix(in oklab, var(--queue), var(--danger) ${pct}%)`
}

/** Icon-tile / value styling for the KPI cards. */
export const KPI_TONE: Record<Tone, { tile: string; icon: string; value: string }> = {
  accent: { tile: "bg-accent/10", icon: "text-accent", value: "text-primary" },
  warning: { tile: "bg-queue/10", icon: "text-queue", value: "text-queue" },
  danger: { tile: "bg-danger/10", icon: "text-danger", value: "text-danger" },
  success: { tile: "bg-success/10", icon: "text-success", value: "text-success" },
  primary: { tile: "bg-primary/10", icon: "text-primary", value: "text-primary" },
}

/** Generic badge styling keyed by semantic tone (status pills, etc.). */
export const TONE_BADGE: Record<Tone, string> = {
  accent: "bg-accent/12 text-accent",
  warning: "bg-queue-muted text-queue",
  danger: "bg-danger-muted text-danger",
  success: "bg-success/12 text-success",
  primary: "bg-primary/10 text-primary",
}

/** Pill styling for the featured-case tags. */
export const TAG_TONE: Record<string, string> = {
  danger: "bg-danger-muted text-danger",
  warning: "bg-queue-muted text-queue",
  violet: "bg-violet-muted text-violet",
  accent: "bg-accent/12 text-accent",
  anticipate: "bg-anticipate-muted text-anticipate",
}
