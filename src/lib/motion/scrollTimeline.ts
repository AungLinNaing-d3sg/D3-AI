import { STAGE_IDS, type CameraKeyframe, type LightKeyframe, type StageId } from "@/types";
import { journeyState, resetJourneyState } from "@/lib/motion/journeyState";
import { clamp, lerp, mapRange, smoothstep } from "@/lib/motion/mathUtils";
import { ensureGsapRegistered, ScrollTrigger } from "@/lib/motion/gsap";

/**
 * The single continuous camera flight path through the whole experience —
 * one keyframe *between* every stage (10 waypoints for 9 stages), authored to
 * read as one cinematic move rather than 9 independent shots: push in from a
 * wide establishing shot, settle for the About Us identity emblem, weave past
 * the typography and network, pull back to reveal the data universe, glide
 * into the product UI, settle for the mini-game, pull back for the cinematic
 * future vista, then rest centred for the final CTA.
 */
const cameraKeyframes: CameraKeyframe[] = [
  { x: 0, y: 0.5, z: 9.5, lookX: 0, lookY: 0, lookZ: 0, fov: 42 }, // 0 — intro start
  { x: 0, y: 0.15, z: 6, lookX: 0, lookY: 0, lookZ: 0, fov: 45 }, // 1 — intro end / about start
  { x: -0.4, y: 0.1, z: 4.6, lookX: 0.08, lookY: 0.02, lookZ: -0.4, fov: 46 }, // 2 — about end / typography start
  { x: 0.5, y: 0.05, z: 4, lookX: 0.1, lookY: 0, lookZ: 0, fov: 50 }, // 3 — typography end / neural start
  { x: -1.1, y: 0.35, z: 2.6, lookX: 0.25, lookY: 0, lookZ: -1.2, fov: 56 }, // 4 — neural end / universe start
  { x: 0, y: 0, z: 5.4, lookX: 0, lookY: 0, lookZ: 0, fov: 46 }, // 5 — universe end / product start
  { x: 0, y: 0.25, z: 4.2, lookX: 0, lookY: 0, lookZ: 0, fov: 42 }, // 6 — product end / game start
  { x: 0, y: 0.4, z: 6.8, lookX: 0, lookY: 0, lookZ: -1, fov: 40 }, // 7 — game end / future start
  { x: 0, y: 0.15, z: 5.6, lookX: 0, lookY: 0, lookZ: 0, fov: 38 }, // 8 — future end / cta start
  { x: 0, y: 0, z: 5, lookX: 0, lookY: 0, lookZ: 0, fov: 36 }, // 9 — cta end
];

const lightKeyframes: LightKeyframe[] = [
  { ambient: 0.55, key: 1.2, rim: 0.6, colorHex: "#4a7ba6" }, // intro
  { ambient: 0.5, key: 1.25, rim: 0.55, colorHex: "#e8b673" }, // about — warm, premium identity light
  { ambient: 0.5, key: 1.35, rim: 0.55, colorHex: "#fd6a50" },
  { ambient: 0.45, key: 1.4, rim: 0.6, colorHex: "#22d3ee" },
  { ambient: 0.4, key: 1.5, rim: 0.7, colorHex: "#6366f1" },
  { ambient: 0.55, key: 1.3, rim: 0.5, colorHex: "#e5e9f2" },
  { ambient: 0.5, key: 1.4, rim: 0.55, colorHex: "#f59e0b" },
  { ambient: 0.35, key: 1.1, rim: 0.75, colorHex: "#7c8cff" },
  { ambient: 0.4, key: 1.5, rim: 0.6, colorHex: "#f14a30" },
  { ambient: 0.3, key: 1.8, rim: 0.5, colorHex: "#f14a30" }, // cta
];

/** Soft crossfade envelope: ramps 0→1 over the first `edge` of local
 * progress and 1→0 over the last `edge`, flat at 1 in between. The very
 * first/last stage never fades to 0 at the outer page boundary since
 * there's nothing before/after to dissolve from. */
function crossfadeWeight(local: number, edge: number, isFirst: boolean, isLast: boolean): number {
  const inWeight = isFirst ? 1 : smoothstep(0, edge, local);
  const outWeight = isLast ? 1 : 1 - smoothstep(1 - edge, 1, local);
  return clamp(Math.min(inWeight, outWeight));
}

interface StageBounds {
  id: StageId;
  top: number;
  height: number;
}

/**
 * Builds the single scroll-scrubbed source of truth for the whole journey.
 *
 * Rather than one nested GSAP timeline per field (fragile to keep in sync
 * across 8 very different scenes), this creates exactly one `ScrollTrigger`
 * spanning the full experience and, on every scrub update, derives each
 * stage's local progress/crossfade weight and the camera/light position
 * directly from scroll position — see CLAUDE.md "reusable animation
 * utilities" / "do not duplicate animation logic".
 *
 * @param stageEls Stage sections in document order, each tagged
 *   `data-stage="<StageId>"`; must line up 1:1 with `STAGE_IDS`.
 * @param wrapperEl The ancestor spanning all stages.
 * @returns A cleanup function that removes the ScrollTrigger.
 */
export function initJourneyTimeline(
  stageEls: { id: StageId; el: HTMLElement }[],
  wrapperEl: HTMLElement
): () => void {
  if (typeof window === "undefined" || stageEls.length === 0) {
    return () => undefined;
  }

  ensureGsapRegistered();

  const bounds: StageBounds[] = stageEls.map(({ id, el }) => ({
    id,
    top: el.offsetTop - wrapperEl.offsetTop,
    height: Math.max(el.offsetHeight, 1),
  }));
  const total = Math.max(wrapperEl.offsetHeight, 1);

  const trigger = ScrollTrigger.create({
    trigger: wrapperEl,
    start: "top top",
    end: "bottom bottom",
    scrub: 0.6,
    invalidateOnRefresh: true,
    onUpdate(self) {
      const scrollY = self.progress * total;
      journeyState.globalProgress = self.progress;

      let activeStage: StageId = bounds[0]?.id ?? STAGE_IDS[0];
      let activeWeight = -1;

      bounds.forEach((bound, index) => {
        const local = clamp((scrollY - bound.top) / bound.height);
        journeyState.progress[bound.id] = local;

        const weight = crossfadeWeight(local, 0.22, index === 0, index === bounds.length - 1);
        journeyState.weight[bound.id] = weight;

        if (weight > activeWeight) {
          activeWeight = weight;
          activeStage = bound.id;
        }
      });
      journeyState.activeStage = activeStage;

      // Continuous camera/light flight: find which stage segment we're in
      // (by pixel position) and lerp between its `from`/`to` keyframes.
      const segmentIndex = bounds.findIndex(
        (bound) => scrollY >= bound.top && scrollY < bound.top + bound.height
      );
      const resolvedIndex = segmentIndex === -1 ? (scrollY < total / 2 ? 0 : bounds.length - 1) : segmentIndex;
      const bound = bounds[resolvedIndex];
      const localT = bound ? clamp((scrollY - bound.top) / bound.height) : 0;
      const eased = smoothstep(0, 1, localT);

      const from = cameraKeyframes[resolvedIndex] ?? cameraKeyframes[0];
      const to = cameraKeyframes[resolvedIndex + 1] ?? cameraKeyframes[cameraKeyframes.length - 1];
      if (from && to) {
        journeyState.camera.x = lerp(from.x, to.x, eased);
        journeyState.camera.y = lerp(from.y, to.y, eased);
        journeyState.camera.z = lerp(from.z, to.z, eased);
        journeyState.camera.lookX = lerp(from.lookX, to.lookX, eased);
        journeyState.camera.lookY = lerp(from.lookY, to.lookY, eased);
        journeyState.camera.lookZ = lerp(from.lookZ, to.lookZ, eased);
        journeyState.camera.fov = lerp(from.fov, to.fov, eased);
      }

      const lightFrom = lightKeyframes[resolvedIndex] ?? lightKeyframes[0];
      const lightTo = lightKeyframes[resolvedIndex + 1] ?? lightKeyframes[lightKeyframes.length - 1];
      if (lightFrom && lightTo) {
        journeyState.light.ambient = lerp(lightFrom.ambient, lightTo.ambient, eased);
        journeyState.light.key = lerp(lightFrom.key, lightTo.key, eased);
        journeyState.light.rim = lerp(lightFrom.rim, lightTo.rim, eased);
        journeyState.light.colorHex = eased < 0.5 ? lightFrom.colorHex : lightTo.colorHex;
      }
    },
  });

  return () => {
    trigger.kill();
    resetJourneyState();
  };
}

/** Utility consumed by scenes that need to map their own stage-local
 * progress into a sub-range (e.g. "word 2 of 5 forms between 0.2 and 0.4").
 * Re-exported here so scenes don't each hand-roll the same clamp+remap. */
export { mapRange, clamp, smoothstep, lerp };
