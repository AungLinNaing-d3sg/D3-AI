import { ensureGsapRegistered, gsap, ScrollTrigger } from "@/lib/motion/gsap";

/**
 * Scroll-scrubbed depth for HTML content, so chapters move like objects in
 * the same space the shared camera flies through (lib/motion/scrollTimeline.ts)
 * rather than flat layers sliding over it:
 *
 * - `[data-depth-exit]` — as a chapter leaves through the top of the
 *   screen, its content recedes: a small push back in Z and a slight rise,
 *   scrubbed to scroll the same way the camera is. Transform only — never
 *   opacity or filter, which would make the wrapper a backdrop root and
 *   switch off the glass cards' `backdrop-filter` inside it.
 * - `[data-depth-scroll]` — writes `--scroll-depth` (-1 entering at the
 *   bottom .. 1 leaving at the top) for inner `.depth-layer` elements
 *   to offset at different rates (see globals.css "Depth surfaces"). A
 *   single custom property per element — cheap enough for phones.
 *
 * Started by `ScrollChoreographer` whenever motion is allowed; the exit
 * recede is desktop/tablet only (`withExit`).
 */
export function initDepthScroll(root: ParentNode, { withExit }: { withExit: boolean }): () => void {
  if (typeof window === "undefined") return () => undefined;
  ensureGsapRegistered();

  const ctx = gsap.context(() => {
    if (withExit) {
      gsap.utils.toArray<HTMLElement>("[data-depth-exit]", root).forEach((el) => {
        gsap.fromTo(
          el,
          { z: 0, y: 0, transformPerspective: 1200 },
          {
            z: -90,
            y: -28,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "bottom 55%",
              end: "bottom top",
              scrub: 0.6,
            },
          }
        );
      });
    }

    gsap.utils.toArray<HTMLElement>("[data-depth-scroll]", root).forEach((el) => {
      const setDepth = (progress: number) => el.style.setProperty("--scroll-depth", (progress * 2 - 1).toFixed(3));
      ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => setDepth(self.progress),
        onRefresh: (self) => setDepth(self.progress),
      });
    });
  });

  return () => {
    ctx.revert();
    gsap.utils.toArray<HTMLElement>("[data-depth-scroll]", root).forEach((el) => el.style.removeProperty("--scroll-depth"));
  };
}
