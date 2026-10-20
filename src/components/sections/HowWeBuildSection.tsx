import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { TechChips } from "./TechChips";
import { ProcessPanel } from "./ProcessPanel";

/**
 * Chapter 04 — How We Build: the technology ecosystem, then the delivery
 * process. The live, camera-traversed network lives in the shared 3D canvas
 * (three/scenes/NeuralScene.tsx) — the real technology stack
 * (src/data/technology.ts) arranged around a central hub. This layer
 * supplies the chapter heading and a fully accessible, always-visible list
 * of every node label the graph renders, satisfying "accessible
 * alternatives for information displayed through 3D/WebGL". The
 * THINK/LEARN/UNDERSTAND/PREDICT/CREATE thought pipeline now lives
 * exclusively in the hero (see HeroSection/IntroScene) — this chapter no
 * longer duplicates it.
 *
 * Below the stack, the delivery process (Assess → Plan → Build → Run, from
 * development_v2 — see ProcessPanel) sits in a translucent glass panel, so
 * the network keeps moving behind it.
 */
export function HowWeBuildSection() {
  return (
    <Section
      stageId="neural"
      ariaLabelledBy="neural-heading"
      className="min-h-[75vh] md:min-h-[90vh] lg:min-h-[100vh]"
    >
      {/* Flows with the page at every size (no pin) — the chapter's 3D
          scene follows it via the scroll timeline's mid-screen reading
          point (lib/motion/scrollTimeline.ts). */}
      <div className="relative flex h-auto flex-col justify-center gap-8 py-12 md:min-h-[100svh] md:gap-10 md:py-20 lg:gap-12 lg:py-24">
        <Container data-depth-exit className="flex flex-col gap-10">
          <SectionHeading
            headingId="neural-heading"
            stage="neural"
            title={
              <>
                A network built on <span className="v2-accent">real capability</span>
              </>
            }
            description="The real technology stack behind every engagement — visualised behind this section as a live, camera-traversed network around a central hub."
            className="build-heading"
            scrim
          />

          <div className="build-stack">
            <p className="build-label">
              <span aria-hidden="true" className="build-label-dot" />
              The stack behind every step
            </p>
            <Reveal as="div" variant="depth" delay={0.2} className="build-chips">
              <TechChips />
            </Reveal>
          </div>
        </Container>
      </div>

      <Container className="pb-16 md:pb-24 lg:pb-28">
        <ProcessPanel />
      </Container>
    </Section>
  );
}
