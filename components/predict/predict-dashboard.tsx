"use client"

import { useMemo, useState } from "react"
import { TrackFilters } from "@/components/track/track-filters"
import { PredictApplicationControl } from "./predict-application-control"
import { PredictApplicationDialog } from "./predict-application-dialog"
import { PredictHorizon } from "./predict-horizon"
import { PredictLevelSwitch, type PredictLevel } from "./predict-level-switch"
import { PredictSystem } from "./predict-system"
import {
  DEFAULT_APPLICATION_FILTERS,
  filterApplications,
  filteredPortfolioScale,
  type Application,
  type ApplicationFilters,
} from "@/lib/applications"
import type { ForecastHorizon } from "@/lib/predict-data"
import { STAGES } from "@/lib/track-data"

export function PredictDashboard() {
  const [level, setLevel] = useState<PredictLevel>("system")
  const [horizon, setHorizon] = useState<ForecastHorizon>(30)
  const [filters, setFilters] = useState<ApplicationFilters>(DEFAULT_APPLICATION_FILTERS)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)

  const applications = useMemo(() => filterApplications(filters, "all"), [filters])
  const filterScale = useMemo(() => filteredPortfolioScale(filters, "all"), [filters])
  const estimatedApplications = Math.round(STAGES[0].counts.today * filterScale)

  return (
    <>
      <PredictLevelSwitch
        value={level}
        onChange={(nextLevel) => {
          setLevel(nextLevel)
          setSelectedApplication(null)
        }}
      />

      <PredictHorizon value={horizon} onChange={setHorizon} />

      <TrackFilters
        filters={filters}
        estimatedApplications={estimatedApplications}
        sampledApplications={applications.length}
        onChange={setFilters}
      />

      {level === "system" ? (
        <PredictSystem
          applications={applications}
          filters={filters}
          filterScale={filterScale}
          horizon={horizon}
          onOpenApplication={setSelectedApplication}
          onViewAllPredictedRisks={() => setLevel("application")}
        />
      ) : (
        <PredictApplicationControl
          applications={applications}
          horizon={horizon}
          onOpenApplication={setSelectedApplication}
        />
      )}

      <PredictApplicationDialog
        application={selectedApplication}
        horizon={horizon}
        open={selectedApplication !== null}
        onOpenChange={(open) => !open && setSelectedApplication(null)}
      />
    </>
  )
}
