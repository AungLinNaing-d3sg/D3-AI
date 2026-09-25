import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { technologyNetworkNodes } from "@/data/journey";

/**
 * Chapter 04 — AI Neural Network / technology ecosystem. The live,
 * camera-traversed network lives in the shared 3D canvas
 * (three/scenes/NeuralScene.tsx) — the real technology stack
 * (src/data/technology.ts) arranged around a central hub. This layer
 * supplies the chapter heading and a fully accessible, always-visible list
 * of every node label the graph renders, satisfying "accessible
 * alternatives for information displayed through 3D/WebGL". The
 * THINK/LEARN/UNDERSTAND/PREDICT/CREATE thought pipeline now lives
 * exclusively in the hero (see IntroSection/IntroScene) — this chapter no
 * longer duplicates it.
 */
export function NeuralSection() {
  return (
    <Section
      stageId="neural"
      ariaLabelledBy="neural-heading"
      className="min-h-[75vh] md:min-h-[90vh] lg:min-h-[100vh]"
    >
      {/* Pinned only from tablet up — see IntroSection for why mobile flows
          normally instead of holding a full-screen pin. */}
      <div className="relative flex h-auto flex-col justify-center gap-8 py-12 md:sticky md:top-0 md:min-h-[100svh] md:gap-10 md:py-20 lg:gap-12 lg:py-24">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            headingId="neural-heading"
            eyebrow="04 — How we build"
            title="A network built on real capability"
            description="The real technology stack behind every engagement — visualised behind this section as a live, camera-traversed network around a central hub."
            scrim
          />

          <Reveal as="div" delay={0.05} className="flex flex-wrap gap-2.5">
            {technologyNetworkNodes.map((node) => (
              <span
                key={node.id}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-ink-300"
              >
                {node.label}
              </span>
            ))}
          </Reveal>
        </Container>
      </div>
    </Section>
  );
}
