"use client"

import { useEffect, useRef } from "react"
import {
  CLARIFICATION_LOOPS,
  EXIT_POINTS,
  STAGES,
  interpPressure,
  interpStageCount,
  spawnForMonth,
  stagePressure,
  type Diagnostics,
  type FlowMode,
  type Timeframe,
} from "@/lib/track-data"
import { CONNECTION_TYPE_COLORS, type ConnectionType } from "@/lib/applications"

/* ------------------------------------------------------------------ *
 * Marble-run case-flow simulation — the "sense" layer.
 *
 * Individual "case" tokens spawn at the first stage and travel the full
 * serpentine path along smoothly curved pipes. Each stage releases tokens on a
 * service interval — the bottleneck releases slowly, so a queue visibly piles
 * up in front of it. A share of tokens peel off along clarification arcs (loop
 * back) and a share exit the system entirely at fallout points (drop-out).
 *
 * TIME is a continuous "month" position (0 → 6) driven by the parent playhead.
 * Congestion, inflow and the baseline card numbers are interpolated from that
 * position every frame, so scrubbing/playing is perfectly smooth — no discrete
 * reseeds. The "afterActions" scenario is a separate seed/target.
 *
 * The engine is the live source of truth for: stage card numbers, loop
 * counters, the fallout tally, and the live diagnostics strip.
 * ------------------------------------------------------------------ */

interface FlowSimulationProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  stageRefs: React.MutableRefObject<(HTMLElement | null)[]>
  /** Continuous forecast position in months (0..6). Ignored when scenario is on. */
  month: number
  /** When true, ease everything toward the "with CCM actions" scenario. */
  scenario: boolean
  playing: boolean
  mode: FlowMode
  /** Share of the aggregate portfolio represented by the active filters. */
  filterScale: number
  /** Keep case colours aligned with the active connection-type filter. */
  connectionTypeFilter: "All" | ConnectionType
  bottleneckIndex: number
  /** Stage index to visually emphasise (from a diagnostics click), or -1. */
  focusIndex?: number
  /** bumped by the parent whenever layout may have changed (resize/expand) */
  measureTick: number
  /** Live per-stage counts, reported as cases move. */
  onCounts?: (stageCounts: number[]) => void
  /** Live diagnostics for the "sense" strip. */
  onDiagnostics?: (d: Diagnostics) => void
}

type Pt = { x: number; y: number }

// Approximations of the theme tokens (canvas needs concrete colours).
const ORANGE = "#E0752C"
const RED = "#CE3B26"
const TEAL = "#3E63C7"
const SLATE = "#64748B"

const N = STAGES.length
const rowOf = (i: number) => (i < 6 ? 0 : i < 11 ? 1 : 2)

// Loop source -> destination (global stage indices) + label.
const ROW_START = [0, 6, 11]
const LOOPS = CLARIFICATION_LOOPS.map((l) => ({
  src: ROW_START[l.row] + l.fromCol,
  dst: ROW_START[l.row] + l.toCol,
  label: l.label,
  row: l.row,
  span: Math.abs(l.fromCol - l.toCol),
  tier: 0,
}))
for (const row of new Set(LOOPS.map((l) => l.row))) {
  const group = LOOPS.filter((l) => l.row === row).sort((a, b) => a.span - b.span)
  group.forEach((l, i) => (l.tier = i))
}
const LOOP_SRC = new Map(LOOPS.map((l) => [l.src, l]))

// Exit points keyed by stage index.
const EXIT_BY_INDEX = new Map(
  EXIT_POINTS.map((e) => [STAGES.findIndex((s) => s.id === e.stageId), e]),
)

// Representative dwell (days) per unit of congestion — used for the "biggest
// delay" diagnostic. Purely illustrative.
const DWELL_BASE = 4
const DWELL_SCALE = 34

interface Token {
  state: "queue" | "move" | "exit"
  stage: number
  path: Pt[] | null
  dur: number
  tt: number
  targetPressure: number
  connectionType: ConnectionType
  loopLabel?: string
  exiting?: boolean
}

interface EngineState {
  seeded: boolean
  queues: Token[][]
  moving: Token[]
  exiting: Token[]
  baselineStage: number[]
  seedQueueLen: number[]
  liveLoop: Record<string, number>
  curPressure: number[]
  prevQueueLen: number[]
  growthRate: number[] // smoothed queue growth per stage (cases/s)
  lost: number
  entered: number
  spawnAcc: number
  scenarioMix: number // 0 = forecast month, 1 = full scenario
  nextCaseNumber: number
}

// Weighted sequence keeps the illustrative feed varied and deterministic.
const CONNECTION_TYPE_SEQUENCE: ConnectionType[] = [
  "Generation",
  "Demand",
  "Generation",
  "Storage",
  "Generation",
  "Hybrid",
  "Demand",
  "Interconnector",
  "Storage",
  "Generation",
]

function connectionTypeFor(caseNumber: number, filter: "All" | ConnectionType): ConnectionType {
  if (filter !== "All") return filter
  return CONNECTION_TYPE_SEQUENCE[caseNumber % CONNECTION_TYPE_SEQUENCE.length]
}

function hexLerp(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16))
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * Math.max(0, Math.min(1, t))))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

/** Chaikin corner-cutting — turns an elbowed polyline into a smooth curve. */
function chaikin(pts: Pt[], iters = 2): Pt[] {
  let p = pts
  for (let k = 0; k < iters; k++) {
    if (p.length < 3) break
    const out: Pt[] = [p[0]]
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i]
      const b = p[i + 1]
      out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 })
      out.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 })
    }
    out.push(p[p.length - 1])
    p = out
  }
  return p
}

function polylineLen(pts: Pt[]) {
  let len = 0
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  return len
}

function samplePolyline(pts: Pt[], t: number): Pt {
  const total = polylineLen(pts)
  let target = total * Math.max(0, Math.min(1, t))
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    if (target <= seg || i === pts.length - 1) {
      const f = seg === 0 ? 0 : target / seg
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f }
    }
    target -= seg
  }
  return pts[pts.length - 1]
}

export function FlowSimulation({
  containerRef,
  stageRefs,
  month,
  scenario,
  playing,
  mode,
  filterScale,
  connectionTypeFilter,
  bottleneckIndex,
  focusIndex = -1,
  measureTick,
  onCounts,
  onDiagnostics,
}: FlowSimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stateRef = useRef<EngineState | null>(null)
  const stateConfigRef = useRef("")
  // Live inputs read every frame (so we don't rebuild the RAF loop on scrub).
  const monthRef = useRef(month)
  const scenarioRef = useRef(scenario)
  const playingRef = useRef(playing)
  const focusRef = useRef(focusIndex)
  const onCountsRef = useRef(onCounts)
  const onDiagRef = useRef(onDiagnostics)
  monthRef.current = month
  scenarioRef.current = scenario
  playingRef.current = playing
  focusRef.current = focusIndex
  onCountsRef.current = onCounts
  onDiagRef.current = onDiagnostics

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    const canvasContext = canvas.getContext("2d")
    if (!canvasContext) return
    const ctx: CanvasRenderingContext2D = canvasContext
    const complex = mode === "complex"
    const aggregateScale = Math.max(0, Math.min(1, filterScale))
    const visualScale = aggregateScale === 0 ? 0 : Math.max(0.28, Math.sqrt(aggregateScale))
    const stateConfig = `${mode}:${aggregateScale.toFixed(4)}:${connectionTypeFilter}`
    if (stateConfigRef.current !== stateConfig) {
      stateRef.current = null
      stateConfigRef.current = stateConfig
    }

    // --- Measure card centres relative to the container ---------------
    const crect = container.getBoundingClientRect()
    const centers: (Pt & { hw: number; hh: number })[] = []
    for (let i = 0; i < N; i++) {
      const el = stageRefs.current[i]
      if (!el) return
      const r = el.getBoundingClientRect()
      centers.push({
        x: r.left - crect.left + r.width / 2,
        y: r.top - crect.top + r.height / 2,
        hw: r.width / 2,
        hh: r.height / 2,
      })
    }

    const W = container.scrollWidth
    const H = container.scrollHeight
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // --- Build smoothly-curved forward + loop paths -------------------
    const forwardPath: Pt[][] = []
    for (let i = 0; i < N - 1; i++) {
      const A = centers[i]
      const B = centers[i + 1]
      if (rowOf(i) === rowOf(i + 1)) {
        forwardPath[i] = [
          { x: A.x + A.hw, y: A.y },
          { x: B.x - B.hw, y: B.y },
        ]
      } else {
        const R = 34
        const midY = (A.y + A.hh + (B.y - B.hh)) / 2
        forwardPath[i] = chaikin(
          [
            { x: A.x, y: A.y + A.hh },
            { x: A.x + R, y: A.y + A.hh + 6 },
            { x: A.x + R, y: midY },
            { x: B.x, y: midY },
            { x: B.x, y: B.y - B.hh - 6 },
            { x: B.x, y: B.y - B.hh },
          ],
          3,
        )
      }
    }
    const loopPath = new Map<number, Pt[]>()
    for (const l of LOOPS) {
      const A = centers[l.src]
      const B = centers[l.dst]
      const up = 30 + l.tier * 22
      loopPath.set(
        l.src,
        chaikin(
          [
            { x: A.x, y: A.y - A.hh },
            { x: A.x, y: A.y - A.hh - up },
            { x: B.x, y: B.y - B.hh - up },
            { x: B.x, y: B.y - B.hh },
          ],
          3,
        ),
      )
    }
    // Exit chutes drop straight down out of the stage.
    const exitPath = new Map<number, Pt[]>()
    for (const [idx] of EXIT_BY_INDEX) {
      const c = centers[idx]
      exitPath.set(idx, [
        { x: c.x + c.hw * 0.55, y: c.y + c.hh },
        { x: c.x + c.hw * 0.55 + 10, y: c.y + c.hh + 42 },
      ])
    }

    const cap: number[] = STAGES.map((_, i) =>
      Math.max(2, Math.round((i === bottleneckIndex ? 42 : 9) * visualScale)),
    )
    const SPEED = 118
    const LOOP_SPEED = 90
    const EXIT_SPEED = 70
    const MAX = Math.round(150 * visualScale)
    const loopProb = 0.22

    // Congestion / inflow / baseline read from the continuous playhead.
    const effPressure = (): number[] => {
      const m = monthRef.current
      const s = stateRef.current!
      const mix = s.scenarioMix
      return STAGES.map((st, i) => {
        const fore = interpPressure(st, m)
        const scen = stagePressure(st, "afterActions")
        return fore + (scen - fore) * mix
      })
    }
    const effSpawn = () => {
      if (visualScale === 0) return Number.POSITIVE_INFINITY
      const mix = stateRef.current!.scenarioMix
      return (spawnForMonth(monthRef.current) * (1 - mix) + 340 * mix) / visualScale
    }

    const intervalOf = (i: number, p: number[]) =>
      i === bottleneckIndex ? 300 + (1 - stateRef.current!.scenarioMix) * (300 + p[i] * 1200) : 210 + p[i] * 520

    // --- Seed once ----------------------------------------------------
    let S = stateRef.current
    if (!S || !S.seeded) {
      const m0 = monthRef.current
      const startP = STAGES.map((st) => interpPressure(st, m0))
      const queues: Token[][] = Array.from({ length: N }, () => [])
      let nextCaseNumber = 0
      for (let i = 0; i < N; i++) {
        const seed = Math.round(startP[i] * (i === bottleneckIndex ? 30 : 7) * visualScale)
        for (let k = 0; k < seed; k++) {
          queues[i].push({
            state: "queue",
            stage: i,
            path: null,
            dur: 0,
            tt: 0,
            targetPressure: startP[i],
            connectionType: connectionTypeFor(nextCaseNumber++, connectionTypeFilter),
          })
        }
      }
      const liveLoop: Record<string, number> = {}
      for (const l of LOOPS) liveLoop[l.label] = Math.round((startP[l.src] * 12 + 3) * visualScale)
      S = {
        seeded: true,
        queues,
        moving: [],
        exiting: [],
        baselineStage: STAGES.map((st) => interpStageCount(st, m0) * aggregateScale),
        seedQueueLen: queues.map((queue) => queue.length),
        liveLoop,
        curPressure: startP.slice(),
        prevQueueLen: queues.map((q) => q.length),
        growthRate: new Array(N).fill(0),
        lost: Math.round(7 * aggregateScale),
        entered: Math.round(126 * aggregateScale),
        spawnAcc: 0,
        scenarioMix: scenarioRef.current ? 1 : 0,
        nextCaseNumber,
      }
      stateRef.current = S
    } else {
      // Re-measured: paths are stale, so settle any in-flight tokens.
      for (const tk of S.moving) {
        tk.state = "queue"
        S.queues[tk.stage].push(tk)
        if (tk.loopLabel) {
          S.liveLoop[tk.loopLabel] = Math.max(0, (S.liveLoop[tk.loopLabel] ?? 1) - 1)
          tk.loopLabel = undefined
        }
      }
      S.moving = []
      S.exiting = []
    }
    const state = S

    const total = () => state.moving.length + state.queues.reduce((a, q) => a + q.length, 0)
    const currentStageCounts = () =>
      state.baselineStage.map((baseline, index) => baseline + state.queues[index].length - state.seedQueueLen[index])

    let lastReport = 0
    function report(now: number, force = false) {
      if (!force && now - lastReport < 110) return
      lastReport = now
      onCountsRef.current?.(currentStageCounts().map((value) => Math.round(value)))
      emitDiagnostics()
    }

    function emitDiagnostics() {
      const p = state.curPressure
      // Bottleneck = configured stage; queue = its live pile.
      const bi = bottleneckIndex
      // Fastest-growing queue (excluding energised end).
      let gi = -1
      let gmax = 0
      for (let i = 0; i < N - 1; i++) {
        if (state.growthRate[i] > gmax) {
          gmax = state.growthRate[i]
          gi = i
        }
      }
      // Biggest delay = stage with highest dwell (pressure * queue).
      let di = bi
      let dmax = -1
      for (let i = 0; i < N; i++) {
        const dwell = (DWELL_BASE + p[i] * DWELL_SCALE) * (1 + state.queues[i].length / 20)
        if (dwell > dmax) {
          dmax = dwell
          di = i
        }
      }
      onDiagRef.current?.({
        bottleneck: { stageId: STAGES[bi].id, label: STAGES[bi].label, queue: Math.round(currentStageCounts()[bi]) },
        growing:
          gi >= 0 && gmax > 0.05
            ? { stageId: STAGES[gi].id, label: STAGES[gi].label, delta: gmax }
            : null,
        rework: {
          stageId: "confirm-design",
          label: "Confirm connection design",
          count: Math.round(Object.values(state.liveLoop).reduce((total, count) => total + count, 0) * 0.5),
        },
        fallout: { lost: Math.round(state.lost), rate: state.entered ? state.lost / state.entered : 0 },
        delay: { stageId: STAGES[di].id, label: STAGES[di].label, days: Math.round(dmax) },
      })
    }

    // --- Drawing -------------------------------------------------------
    function pileSlot(stageIdx: number, slot: number): Pt {
      const c = centers[stageIdx]
      const cols = stageIdx === bottleneckIndex ? 6 : 4
      const pitch = 11
      const col = slot % cols
      const row = Math.floor(slot / cols)
      return { x: c.x + (col - (cols - 1) / 2) * pitch, y: c.y + c.hh + 8 + row * pitch }
    }

    function drawConnector(pts: Pt[], targetPressure: number, style: "flow" | "loop" | "exit") {
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.strokeStyle = style === "loop" ? TEAL : style === "exit" ? SLATE : hexLerp(ORANGE, RED, targetPressure)
      ctx.globalAlpha = style === "flow" ? 0.28 : 0.5
      ctx.lineWidth = 2
      if (style !== "flow") ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
    }

    function drawToken(p: Pt, color: string, r = 4.6, pressure = 0) {
      if (pressure > 0.45) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, r + 1.8, 0, Math.PI * 2)
        ctx.strokeStyle = RED
        ctx.globalAlpha = Math.min(0.8, pressure)
        ctx.lineWidth = 1.4
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = 4
      ctx.fill()
      ctx.shadowBlur = 0
    }

    function drawPill(text: string, x: number, y: number, color: string) {
      ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif"
      ctx.textAlign = "center"
      const w = ctx.measureText(text).width + 10
      const h = 13
      const rx = x - w / 2
      const ry = y - h + 3
      const rr = 6
      ctx.fillStyle = "#ffffff"
      ctx.globalAlpha = 0.92
      ctx.beginPath()
      ctx.moveTo(rx + rr, ry)
      ctx.arcTo(rx + w, ry, rx + w, ry + h, rr)
      ctx.arcTo(rx + w, ry + h, rx, ry + h, rr)
      ctx.arcTo(rx, ry + h, rx, ry, rr)
      ctx.arcTo(rx, ry, rx + w, ry, rr)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.fillStyle = color
      ctx.fillText(text, x, y)
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const p = state.curPressure
      const focus = focusRef.current

      for (let i = 0; i < N - 1; i++) drawConnector(forwardPath[i], p[i + 1], "flow")
      if (complex) {
        for (const [, pts] of exitPath) drawConnector(pts, 0, "exit")
        for (const l of LOOPS) {
          const pts = loopPath.get(l.src)!
          drawConnector(pts, 0, "loop")
          const mid = pts[Math.floor(pts.length / 2)] ?? pts[0]
          const cx = (centers[l.src].x + centers[l.dst].x) / 2
          drawPill(`${l.label} · ${Math.round(state.liveLoop[l.label] ?? 0)} active`, cx, mid.y - 4, TEAL)
        }
        // Exit tallies at each chute.
        for (const [idx, pts] of exitPath) {
          const end = pts[pts.length - 1]
          drawPill(EXIT_BY_INDEX.get(idx)!.kind, end.x + 4, end.y + 12, SLATE)
        }
      }

      for (let i = 0; i < N; i++) {
        const q = state.queues[i]
        const heat = Math.min(1, q.length / (i === bottleneckIndex ? 26 : 7))
        const shown = Math.min(q.length, i === bottleneckIndex ? 42 : 20)
        // Focus ring behind the pile.
        if (focus === i) {
          const c = centers[i]
          ctx.beginPath()
          ctx.arc(c.x, c.y + c.hh + 20, 30, 0, Math.PI * 2)
          ctx.strokeStyle = TEAL
          ctx.globalAlpha = 0.5
          ctx.lineWidth = 2
          ctx.stroke()
          ctx.globalAlpha = 1
        }
        for (let s = 0; s < shown; s++) {
          const token = q[s]
          drawToken(
            pileSlot(i, s),
            CONNECTION_TYPE_COLORS[token.connectionType],
            4.2,
            i === bottleneckIndex ? Math.max(heat, p[i]) : heat,
          )
        }
      }

      for (const tk of state.moving) {
        if (!tk.path) continue
        drawToken(
          samplePolyline(tk.path, tk.tt / tk.dur),
          CONNECTION_TYPE_COLORS[tk.connectionType],
          4.6,
          tk.targetPressure,
        )
      }
      // Exiting tokens fade as they leave.
      for (const tk of state.exiting) {
        if (!tk.path) continue
        const f = tk.tt / tk.dur
        ctx.globalAlpha = 1 - f
        drawToken(samplePolyline(tk.path, f), CONNECTION_TYPE_COLORS[tk.connectionType], 4.2)
        ctx.globalAlpha = 1
      }
    }

    // --- Continuous eases (run whether playing or paused) -------------
    const gate = new Array(N).fill(0)
    function ease(dt: number) {
      const k = Math.min(1, dt / 300)
      // Scenario mix glides toward target.
      const targetMix = scenarioRef.current ? 1 : 0
      state.scenarioMix += (targetMix - state.scenarioMix) * k

      const tgtP = effPressure()
      for (let i = 0; i < N; i++) {
        state.curPressure[i] += (tgtP[i] - state.curPressure[i]) * k
      }
    }

    // --- Engine step (movement + discrete counting) -------------------
    function step(dt: number) {
      const p = state.curPressure
      const spawn = effSpawn()

      state.spawnAcc += dt
      if (state.spawnAcc >= spawn && total() < MAX) {
        state.spawnAcc -= spawn
        state.queues[0].push({
          state: "queue",
          stage: 0,
          path: null,
          dur: 0,
          tt: 0,
          targetPressure: p[0],
          connectionType: connectionTypeFor(state.nextCaseNumber++, connectionTypeFilter),
        })
        state.entered += 1
      }

      for (let i = 0; i < N; i++) {
        gate[i] += dt
        if (gate[i] < intervalOf(i, p) || state.queues[i].length === 0) continue

        // Fallout: chance a case exits the system here.
        const exit = complex ? EXIT_BY_INDEX.get(i) : undefined
        if (exit && exitPath.has(i)) {
          const rate = exit.baseRate * (0.6 + p[i]) * (1 - state.scenarioMix * 0.7)
          if (Math.random() < rate) {
            gate[i] -= intervalOf(i, p)
            const tk = state.queues[i].shift()!
            tk.state = "exit"
            tk.path = exitPath.get(i)!
            tk.dur = (polylineLen(tk.path) / EXIT_SPEED) * 1000
            tk.tt = 0
            state.exiting.push(tk)
            state.lost += 1
            continue
          }
        }

        const loop = complex ? LOOP_SRC.get(i) : undefined
        const doLoop = loop && Math.random() < loopProb * (1 - state.scenarioMix * 0.6)
        let target: number
        let path: Pt[]
        let speed = SPEED
        if (doLoop && loop) {
          target = loop.dst
          path = loopPath.get(i)!
          speed = LOOP_SPEED
        } else if (i < N - 1) {
          target = i + 1
          path = forwardPath[i]
        } else {
          gate[i] -= intervalOf(i, p)
          state.queues[i].shift()
          continue
        }

        if (state.queues[target].length >= cap[target]) continue

        gate[i] -= intervalOf(i, p)
        const tk = state.queues[i].shift()!
        tk.state = "move"
        tk.stage = target
        tk.path = path
        tk.dur = (polylineLen(path) / speed) * 1000
        tk.tt = 0
        tk.targetPressure = p[target]
        tk.loopLabel = doLoop && loop ? loop.label : undefined
        state.moving.push(tk)

        if (doLoop && loop) state.liveLoop[loop.label] = (state.liveLoop[loop.label] ?? 0) + 1
      }

      for (let m = state.moving.length - 1; m >= 0; m--) {
        const tk = state.moving[m]
        tk.tt += dt
        if (tk.tt >= tk.dur) {
          state.moving.splice(m, 1)
          tk.state = "queue"
          state.queues[tk.stage].push(tk)
          if (tk.loopLabel) {
            state.liveLoop[tk.loopLabel] = Math.max(0, (state.liveLoop[tk.loopLabel] ?? 1) - 1)
            tk.loopLabel = undefined
          }
        }
      }
      for (let m = state.exiting.length - 1; m >= 0; m--) {
        const tk = state.exiting[m]
        tk.tt += dt
        if (tk.tt >= tk.dur) state.exiting.splice(m, 1)
      }

      // Smoothed queue growth rate for the "queues building" diagnostic.
      for (let i = 0; i < N; i++) {
        const rate = ((state.queues[i].length - state.prevQueueLen[i]) / dt) * 1000
        state.growthRate[i] += (rate - state.growthRate[i]) * Math.min(1, dt / 800)
        state.prevQueueLen[i] = state.queues[i].length
      }
    }

    // --- Loop ----------------------------------------------------------
    let raf = 0
    let last = performance.now()
    function frame(now: number) {
      const dt = Math.min(now - last, 50)
      last = now
      ease(dt)
      if (playingRef.current) step(dt)
      draw()
      report(now)
      raf = requestAnimationFrame(frame)
    }

    report(performance.now(), true)
    last = performance.now()
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // Rebuild only on layout change / bottleneck change — NOT on month/scenario
    // (those are read live via refs for smooth scrubbing).
  }, [containerRef, stageRefs, bottleneckIndex, measureTick, mode, filterScale, connectionTypeFilter])

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-10" aria-hidden="true" />
}
