import { ensureGsapRegistered, gsap } from "@/lib/motion/gsap";
import { sceneKeyframes, sceneState, resetSceneState } from "@/lib/motion/sceneState";

/**
 * Builds the master scroll-scrubbed timeline that drives the 3D scene.
 *
 * One GSAP tween-group is created per homepage section, weighted by that
 * section's own rendered height (`el.offsetHeight`). Because ScrollTrigger
 * remaps its 0-1 scroll progress onto the timeline's *relative* duration,
 * this makes every section's camera/lighting/particle transition occupy
 * exactly the scroll distance that section takes up on screen — i.e.
 * "scrolling directly controls the animation progress" per section, not an
 * approximation.
 *
 * @param sectionEls Section elements in document order; must line up 1:1
 *   with `sceneKeyframes` (see src/app/page.tsx).
 * @param wrapperEl The ancestor that spans all sections — used as the
 *   ScrollTrigger trigger so `start`/`end` cover the full experience.
 * @returns A cleanup function that removes the timeline/ScrollTrigger.
 */
export function initSceneScrollTimeline(
  sectionEls: HTMLElement[],
  wrapperEl: HTMLElement
): () => void {
  if (typeof window === "undefined" || sectionEls.length === 0) {
    return () => undefined;
  }

  ensureGsapRegistered();

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: wrapperEl,
      start: "top top",
      end: "bottom bottom",
      scrub: 1,
      invalidateOnRefresh: true,
    },
  });

  let cursor = 0;
  sectionEls.forEach((el, index) => {
    const to =
      sceneKeyframes[Math.min(index + 1, sceneKeyframes.length - 1)] ??
      sceneKeyframes[sceneKeyframes.length - 1];
    const duration = Math.max(el.offsetHeight, 1);
    if (!to) return;

    tl.to(sceneState.camera, { ...to.camera, duration, ease: "none" }, cursor);
    tl.to(
      sceneState.core,
      {
        scale: to.core.scale,
        distort: to.core.distort,
        rotationSpeed: to.core.rotationSpeed,
        duration,
        ease: "none",
      },
      cursor
    );
    tl.to(sceneState.core.color, { ...to.core.color, duration, ease: "none" }, cursor);
    tl.to(sceneState.particles, { ...to.particles, duration, ease: "none" }, cursor);
    tl.to(sceneState.nodes, { ...to.nodes, duration, ease: "none" }, cursor);
    tl.to(sceneState.light, { ...to.light, duration, ease: "none" }, cursor);
    tl.to(sceneState, { vignette: to.vignette, duration, ease: "none" }, cursor);

    cursor += duration;
  });

  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
    resetSceneState();
  };
}
