import { NAV_TABS, type AvailableRelease } from "@/lib/track-data"
import { cn } from "@/lib/utils"

interface TrackHeaderProps {
  activeRelease: AvailableRelease
  onReleaseChange: (release: AvailableRelease) => void
}

const RELEASE_COPY: Record<
  AvailableRelease,
  { release: string; descriptor: string; description: string }
> = {
  track: {
    release: "Release 1",
    descriptor: "Current-state command centre",
    description:
      "See the Connections system as it is now, understand where flow is breaking down, and drill from a system problem to the applications affected by it.",
  },
  predict: {
    release: "Release 2",
    descriptor: "Short-term foresight",
    description:
      "See where pressure is likely to emerge next, understand why, and investigate before flow degrades.",
  },
  simulate: {
    release: "Release 3 — Simulate",
    descriptor: "Scenario exploration",
    description:
      "Test how future demand, process or capacity changes could affect the Connections system.",
  },
}

const RELEASE_ACCENTS: Record<AvailableRelease, { release: string; tab: string }> = {
  track: {
    release: "bg-accent/10 text-accent",
    tab: "border-accent text-primary",
  },
  predict: {
    release: "bg-anticipate-muted text-anticipate",
    tab: "border-anticipate text-primary",
  },
  simulate: {
    release: "bg-simulate-muted text-simulate",
    tab: "border-simulate text-primary",
  },
}

export function TrackHeader({ activeRelease, onReleaseChange }: TrackHeaderProps) {
  const copy = RELEASE_COPY[activeRelease]
  const releaseAccent = RELEASE_ACCENTS[activeRelease].release
  const activeTabAccent = RELEASE_ACCENTS[activeRelease].tab

  return (
    <header className="flex min-w-0 max-w-full flex-col gap-5">
      <div className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded px-2 py-1 text-xs font-bold uppercase", releaseAccent)}>
              {copy.release}
            </span>
            <span className="text-xs font-medium text-muted-foreground">{copy.descriptor}</span>
          </div>
          <h1 className="text-pretty text-2xl font-bold text-primary md:text-3xl lg:text-[2rem] lg:leading-tight">
            Connections Flow Intelligence
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {copy.description}
          </p>
        </div>

        <NesoWordmark />
      </div>

      <div className="max-w-full overflow-x-auto border-b border-border">
        <nav aria-label="Capability releases" className="flex min-w-max items-end gap-7">
          {NAV_TABS.map((tab) => {
            const active = tab.id === activeRelease
            const available = tab.status === "available"
            return (
              <button
                key={tab.id}
                type="button"
                disabled={!available}
                onClick={() => available && onReleaseChange(tab.id as AvailableRelease)}
                aria-current={active ? "page" : undefined}
                title={available ? `Open ${tab.label} (${tab.release})` : `${tab.label} is planned for ${tab.release}`}
                className={cn(
                  "relative flex h-10 items-center gap-2 border-b-2 px-1 text-sm font-semibold transition-colors",
                  active
                    ? activeTabAccent
                    : available
                      ? "border-transparent text-muted-foreground hover:text-foreground"
                      : "cursor-not-allowed border-transparent text-muted-foreground/55",
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[0.62rem] font-bold",
                    active
                      ? RELEASE_ACCENTS[activeRelease].release
                      : "bg-secondary text-muted-foreground/70",
                  )}
                >
                  {tab.release}
                </span>
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

function NesoWordmark() {
  return (
    <div
      className="hidden h-12 shrink-0 items-center gap-2.5 rounded-sm bg-[#4b003b] px-3.5 text-white shadow-sm sm:flex"
      aria-label="NESO — National Energy System Operator"
    >
      <span className="text-[1.7rem] font-bold leading-none">NESO</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 54 42"
        className="h-9 w-[46px] shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M7 2V40" stroke="currentColor" strokeWidth="3.2" />
        <path d="M8 21L47 3" stroke="currentColor" strokeWidth="3.2" />
        <path d="M8 21L52 11" stroke="currentColor" strokeWidth="3.2" />
        <path d="M8 21H53" stroke="currentColor" strokeWidth="3.2" />
        <path d="M8 21L52 31" stroke="currentColor" strokeWidth="3.2" />
        <path d="M8 21L47 39" stroke="currentColor" strokeWidth="3.2" />
      </svg>
    </div>
  )
}
