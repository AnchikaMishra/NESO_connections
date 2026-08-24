"use client"

import { useState } from "react"
import { ChevronDown, ListFilter, SlidersHorizontal, X } from "lucide-react"
import {
  APPLICATION_FILTER_OPTIONS,
  DEFAULT_APPLICATION_FILTERS,
  STATUS_META,
  activeFilterCount,
  type ApplicationFilters,
} from "@/lib/applications"
import { cn } from "@/lib/utils"

interface TrackFiltersProps {
  filters: ApplicationFilters
  estimatedApplications: number
  sampledApplications: number
  onChange: (filters: ApplicationFilters) => void
}

type FilterOption = string | { value: string; label: string }
type FilterField = {
  key: keyof ApplicationFilters
  label: string
  options: readonly FilterOption[]
}

const primaryFields: FilterField[] = [
  { key: "connectionType", label: "Connection type", options: APPLICATION_FILTER_OPTIONS.connectionType },
  { key: "geography", label: "Geography", options: APPLICATION_FILTER_OPTIONS.geography },
  { key: "cohort", label: "Application cohort", options: APPLICATION_FILTER_OPTIONS.cohort },
  { key: "importance", label: "Strategic importance", options: APPLICATION_FILTER_OPTIONS.importance },
  { key: "customerType", label: "Customer type", options: APPLICATION_FILTER_OPTIONS.customerType },
]

const moreKeys: Array<keyof ApplicationFilters> = [
  "generationTechnology",
  "capacityBand",
  "currentStage",
  "status",
  "owningTeam",
  "dwellBand",
  "returnedRework",
  "hasBlocker",
]

export function TrackFilters({
  filters,
  estimatedApplications,
  sampledApplications,
  onChange,
}: TrackFiltersProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const active = activeFilterCount(filters)
  const moreActive = moreKeys.filter((key) => filters[key] !== "All").length
  const moreFields: FilterField[] = [
    ...(filters.connectionType === "Generation"
      ? [{ key: "generationTechnology" as const, label: "Generation technology", options: APPLICATION_FILTER_OPTIONS.generationTechnology }]
      : []),
    { key: "capacityBand", label: "Connection capacity", options: APPLICATION_FILTER_OPTIONS.capacityBand },
    { key: "currentStage", label: "Current stage", options: APPLICATION_FILTER_OPTIONS.currentStage },
    { key: "status", label: "Current status", options: APPLICATION_FILTER_OPTIONS.status },
    { key: "owningTeam", label: "Owning team", options: APPLICATION_FILTER_OPTIONS.owningTeam },
    { key: "dwellBand", label: "Days in current stage", options: APPLICATION_FILTER_OPTIONS.dwellBand },
    { key: "returnedRework", label: "Returned / rework", options: APPLICATION_FILTER_OPTIONS.yesNo },
    { key: "hasBlocker", label: "Outstanding blocker", options: APPLICATION_FILTER_OPTIONS.yesNo },
  ]

  const updateField = (field: keyof ApplicationFilters, value: string) => {
    const nextFilters = { ...filters, [field]: value } as ApplicationFilters
    if (field === "connectionType" && value !== "Generation") nextFilters.generationTechnology = "All"
    onChange(nextFilters)
  }

  return (
    <section className="w-full min-w-0 max-w-full border-y border-border bg-card/70 py-4" aria-label="Current application filters">
      <div className="mb-3 flex flex-col items-start justify-between gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <div className="flex items-center gap-2">
          <ListFilter className="h-4 w-4 text-accent" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">Current application filters</h2>
          {active > 0 && <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">{active} active</span>}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            <span className="font-semibold text-foreground">{estimatedApplications}</span> current applications
            <span className="hidden sm:inline"> · {sampledApplications} detailed examples</span>
          </p>
          {active > 0 && (
            <button
              type="button"
              onClick={() => onChange(DEFAULT_APPLICATION_FILTERS)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
        {primaryFields.map((field) => (
          <FilterSelect key={field.key} field={field} value={filters[field.key]} onChange={updateField} />
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          className={cn(
            "mt-[1.15rem] flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors",
            moreOpen ? "border-accent bg-accent/5 text-primary" : "border-input bg-background text-muted-foreground hover:text-foreground",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          More{moreActive > 0 ? ` (${moreActive})` : ""}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", moreOpen && "rotate-180")} aria-hidden="true" />
        </button>
      </div>

      {moreOpen && (
        <div className="mt-4 grid min-w-0 grid-cols-2 gap-3 border-t border-border pt-4 md:grid-cols-3 xl:grid-cols-4">
          {moreFields.map((field) => (
            <FilterSelect key={field.key} field={field} value={filters[field.key]} onChange={updateField} />
          ))}
        </div>
      )}
    </section>
  )
}

function FilterSelect({
  field,
  value,
  onChange,
}: {
  field: FilterField
  value: string
  onChange: (field: keyof ApplicationFilters, value: string) => void
}) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-[0.68rem] font-semibold uppercase text-muted-foreground">{field.label}</span>
      <select
        value={value}
        onChange={(event) => onChange(field.key, event.target.value)}
        className="h-9 w-full min-w-0 max-w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15"
      >
        <option value="All">All</option>
        {field.options.map((option) => {
          const optionValue = typeof option === "string" ? option : option.value
          const optionLabel =
            typeof option === "string"
              ? field.key === "status"
                ? STATUS_META[option as keyof typeof STATUS_META].label
                : option
              : option.label
          return <option key={optionValue} value={optionValue}>{optionLabel}</option>
        })}
      </select>
    </label>
  )
}
