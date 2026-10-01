"use client";

import { useCallback, useRef, type CSSProperties } from "react";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { capabilities } from "@/data/capabilities";
import { siteConfig } from "@/data/site";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import { DISCIPLINE_COLORS } from "@/lib/motion/heroFocus";
import { visionFocus } from "@/lib/motion/visionFocus";
import { useJourneyFrame } from "@/hooks/useJourneyFrame";
import { useWebglSupported } from "@/hooks/useWebglSupported";

/** The Vision chapter's still fallback when the shared 3D canvas isn't
 * running (reduced motion / no WebGL): the robot's dark studio reduced to
 * its light — studio glow, the chest core's ember ring and the scan ring
 * — in CSS gradients (see `.future-static-vision`). */
function FutureStaticVision() {
  const { enableScene } = useDeviceCapability();
  const webglSupported = useWebglSupported();
  if (enableScene && webglSupported) return null;
  return <div aria-hidden="true" className="future-static-vision pointer-events-none absolute inset-0 -z-10" />;
}

/** The three real disciplines each capability belongs to (see the About
 * and Our Approach chapters), with their colours from the Hero. */
const DISCIPLINES = ["Data", "Dynamics", "Digital"];

/**
 * Chapter 07 — Our vision, as a mission console beside the Vision Unit, a
 * humanoid robot whose whole body follows the cursor
 * (three/scenes/FutureScene.tsx). The copy takes the left column; the
 * right is left open for the robot, framed by a thin HUD (corner brackets,
 * unit ID, tracking readout — decorative, `aria-hidden`).
 *
 * The three real capabilities (src/data/capabilities.ts) are "system
 * modules" in the robot's own material language: graphite glass panels
 * with titanium hairlines, corner brackets, a mono module ID and the
 * discipline's colour. Every module is always fully open and legible; the
 * page scrolls naturally (no pin), and each module comes online as it
 * passes the middle of the screen — its border and brackets light, its
 * sync bar fills and its readout counts up — while the robot's hologram
 * brightens that discipline's ring (`visionFocus`). Scroll-driven state is
 * written straight to the DOM — no React render per frame.
 */
export function FutureSection() {
  const moduleRefs = useRef<Array<HTMLLIElement | null>>([]);
  const readoutRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const lastActive = useRef(-1);
  const lastPercent = useRef<number[]>([]);

  const onFrame = useCallback(() => {
    // The modules scroll with the page (no pin), so each one is read as it
    // passes the middle of the screen: its sync bar fills and its readout
    // counts up as it travels through that reading band, and the module
    // nearest it is the active one.
    const modules = moduleRefs.current;
    const section = modules[0]?.closest("section");
    if (!section) return;
    const viewport = window.innerHeight;
    const rect = section.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > viewport) {
      visionFocus.pillar = -1;
      return;
    }
    const band = viewport * 0.62;
    let active = -1;
    modules.forEach((module, index) => {
      if (!module) return;
      const box = module.getBoundingClientRect();
      // 0 as the module's top reaches the band, 1 once its bottom passes it.
      const fill = Math.min(1, Math.max(0, (band - box.top) / Math.max(box.height, 1)));
      module.style.setProperty("--module-fill", fill.toFixed(3));
      const percent = Math.round(fill * 100);
      const readout = readoutRefs.current[index];
      if (readout && lastPercent.current[index] !== percent) {
        lastPercent.current[index] = percent;
        readout.textContent = `${String(percent).padStart(3, "0")}%`;
      }
      if (box.top < band) active = index;
    });
    visionFocus.pillar = active;
    if (active === lastActive.current) return;
    lastActive.current = active;
    modules.forEach((module, index) => {
      if (module) module.dataset.state = index < active ? "done" : index === active ? "active" : "idle";
    });
  }, []);

  useJourneyFrame(onFrame);

  return (
    <Section
      stageId="future"
      ariaLabelledBy="future-heading"
      className="min-h-[75vh] md:min-h-[90vh] lg:min-h-[105vh]"
    >
      <FutureStaticVision />
      {/* Flows with the page at every size (no pin) — the chapter's 3D
          scene follows it via the scroll timeline's mid-screen reading
          point (lib/motion/scrollTimeline.ts). */}
      <div className="relative flex h-auto flex-col justify-center py-10 md:min-h-[100svh] md:py-14 lg:py-16">
        <Container className="vision-layout">
          <div className="vision-copy">
            <p aria-hidden="true" className="vision-status">
              <span className="vision-status-dot" />
              <span>Vision unit · VU-07</span>
              <span className="vision-status-sep" />
              <span className="vision-status-live">Online</span>
            </p>

            <SectionHeading
              headingId="future-heading"
              eyebrow="07 — Our vision"
              title={siteConfig.tagline}
              description="Not a distant promise — the same three disciplines you just walked through, carried forward."
              scrim
            />

            <ol className="vision-modules depth-stage" aria-label="Our vision, in three pillars">
              {capabilities.map((capability, index) => (
                <li
                  key={capability.slug}
                  ref={(node) => {
                    moduleRefs.current[index] = node;
                  }}
                  data-state="idle"
                  data-depth-tilt
                  aria-labelledby={`vision-${capability.slug}`}
                  style={{ "--discipline": DISCIPLINE_COLORS[index] } as CSSProperties}
                  className="vision-module depth-tilt"
                >
                  <span aria-hidden="true" className="depth-glare" />
                  <Reveal as="div" variant="depth" delay={index * 0.08} className="vision-module-inner">
                    <div className="vision-module-head">
                      <span className="vision-module-id">M-0{index + 1}</span>
                      <span className="vision-module-discipline">
                        <span aria-hidden="true" className="vision-module-dot" />
                        {DISCIPLINES[index]}
                      </span>
                      <span
                        aria-hidden="true"
                        className="vision-module-readout"
                        ref={(node) => {
                          readoutRefs.current[index] = node;
                        }}
                      >
                        100%
                      </span>
                    </div>
                    <h3
                      id={`vision-${capability.slug}`}
                      style={{ "--layer": 4 } as CSSProperties}
                      className="vision-module-title depth-layer"
                    >
                      {capability.title}
                    </h3>
                    <div className="vision-module-body">
                      <div>
                        <p className="vision-module-summary">{capability.summary}</p>
                        <ul className="vision-module-points" aria-label={`${capability.title}: focus areas`}>
                          {capability.points.map((point, pointIndex) => (
                            <li key={point}>
                              <span aria-hidden="true" className="vision-module-point-id">
                                {index + 1}.{pointIndex + 1}
                              </span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Reveal>
                  <span aria-hidden="true" className="vision-module-bar" />
                </li>
              ))}
            </ol>
          </div>

          {/* The robot's side: a thin HUD frame around where it stands. */}
          <div aria-hidden="true" className="vision-stage">
            <span className="vision-stage-corner" data-corner="tl" />
            <span className="vision-stage-corner" data-corner="tr" />
            <span className="vision-stage-corner" data-corner="bl" />
            <span className="vision-stage-corner" data-corner="br" />
            <span className="vision-stage-tag" data-pos="start">
              VU-07 · Humanoid vision unit
            </span>
            <span className="vision-stage-tag" data-pos="end">
              <span className="vision-status-dot" />
              Tracking · 01°19′N 103°54′E
            </span>
          </div>
        </Container>
      </div>
    </Section>
  );
}
