"use client"

import { CalendarClock } from "lucide-react"
import { FORECAST_HORIZONS, type ForecastHorizon } from "@/lib/predict-data"
import { cn } from "@/lib/utils"

interface PredictHorizonProps {
  value: ForecastHorizon
  onChange: (value: ForecastHorizon) => void
}

export function PredictHorizon({ value, onChange }: PredictHorizonProps) {
  return (
    <section
      className="flex flex-col gap-3 border-y border-anticipate/25 bg-anticipate-muted/35 px-4 py-3 md:flex-row md:items-center md:justify-between"
      aria-label="Forecast horizon"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-anticipate/10">
          <CalendarClock className="h-4 w-4 text-anticipate" aria-hidden="true" />
        </span>
        <div title="Illustrative baseline datasets only. This selects a forecast horizon, not a scenario.">
          <h2 className="text-sm font-semibold text-foreground">Forecast horizon</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Illustrative baseline forecast</p>
        </div>
      </div>

      <div className="grid grid-cols-3 rounded-md border border-border bg-card p-1" role="radiogroup" aria-label="Forecast period">
        {FORECAST_HORIZONS.map((horizon) => {
          const active = value === horizon.value
          return (
            <button
              key={horizon.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(horizon.value)}
              className={cn(
                "flex h-10 min-w-[82px] flex-col items-center justify-center rounded px-2 text-center transition-colors sm:min-w-[104px]",
                active ? "bg-anticipate text-white shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <span className="text-xs font-bold">{horizon.label}</span>
              <span className={cn("hidden text-[0.6rem] sm:block", active ? "text-white/80" : "text-muted-foreground")}>
                {horizon.detail}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
