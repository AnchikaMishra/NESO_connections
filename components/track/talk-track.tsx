import { Mic } from "lucide-react"
import { CLICK_NEXT, TALK_TRACK } from "@/lib/track-data"

export function TalkTrack() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-secondary/50 p-5 lg:flex-row lg:items-center">
      <div className="flex flex-1 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Mic className="h-4 w-4 text-primary" aria-hidden="true" />
        </span>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Talk track: </span>
          {TALK_TRACK}
        </p>
      </div>

      <div className="hidden w-px self-stretch bg-border lg:block" aria-hidden="true" />

      <p className="text-sm leading-relaxed text-muted-foreground lg:max-w-xs">
        <span className="font-semibold text-foreground">Click next: </span>
        {CLICK_NEXT}
      </p>
    </div>
  )
}
