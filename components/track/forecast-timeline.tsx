"use client"

import { MONTH_MAX, monthLabel } from "@/lib/track-data"
import { cn } from "@/lib/utils"

interface ForecastTimelineProps {
  month: number
  scenario: boolean
  playing: boolean
  onScrub: (month: number) => void
}

const TICKS = [0, 1, 2, 3, 4, 5, 6]

/**
 * Continuous forecast axis with a moving playhead. During "Play forecast" the
 * head sweeps Now → +6 months and the big label updates continuously, so the
 * point-in-time is never ambiguous. Users can also scrub manually.
 */
export function ForecastTimeline({ month, scenario, playing, onScrub }: ForecastTimelineProps) {
  const pct = (month / MONTH_MAX) * 100
  const disabled = scenario

  return (
    <div className={cn("flex flex-col gap-2", disabled && "pointer-events-none opacity-40")}>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Forecast horizon
        </span>
        <span
          aria-live="polite"
          className={cn(
            "rounded-md px-2 py-0.5 text-sm font-bold tabular-nums",
            playing ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground",
          )}
        >
          {scenario ? "With actions" : `Viewing: ${monthLabel(month)}`}
        </span>
      </div>

      <div className="relative pt-1">
        {/* track */}
        <div className="relative h-2 rounded-full bg-secondary">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-queue to-danger"
            style={{ width: `${pct}%` }}
          />
          {/* playhead */}
          <div
            className={cn(
              "absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow",
              playing && "ring-2 ring-accent/50",
            )}
            style={{ left: `${pct}%` }}
            aria-hidden="true"
          />
        </div>

        <input
          type="range"
          min={0}
          max={MONTH_MAX}
          step={0.1}
          value={month}
          disabled={disabled}
          onChange={(e) => onScrub(Number(e.target.value))}
          aria-label="Forecast horizon in months"
          className="absolute inset-x-0 top-1 h-2 w-full cursor-pointer opacity-0"
        />

        <div className="mt-1.5 flex justify-between">
          {TICKS.map((t) => (
            <button
              key={t}
              type="button"
              disabled={disabled}
              onClick={() => onScrub(t)}
              className={cn(
                "text-[0.65rem] tabular-nums transition-colors",
                Math.abs(month - t) < 0.25 && !scenario
                  ? "font-bold text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === 0 ? "Now" : `+${t}mo`}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
