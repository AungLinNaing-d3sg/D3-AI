import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { primaryConceptNodes, secondaryConceptNodes } from "@/data/journey";

/**
 * Chapter 03 — AI Neural Network. The live, camera-traversed graph lives in
 * the shared 3D canvas (three/scenes/NeuralScene.tsx); this layer supplies
 * the chapter heading and a fully accessible, always-visible list of every
 * node label the graph renders (5 core AI concepts + the real technology
 * ecosystem from src/data/technology.ts), satisfying "accessible
 * alternatives for information displayed through 3D/WebGL".
 */
export function NeuralSection() {
  return (
    <Section stageId="neural" ariaLabelledBy="neural-heading" className="min-h-[280vh]">
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center gap-12 py-24 sm:py-28">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            headingId="neural-heading"
            eyebrow="03 — How we think"
            title="A network built on real capability"
            description="Every idea we ship moves through the same five-step thought process — visualised behind this section as a live, camera-traversed graph."
          />

          <div className="flex flex-col gap-6">
            <Reveal as="div" delay={0.05} className="flex flex-wrap gap-3">
              {primaryConceptNodes.map((node) => (
                <span
                  key={node.id}
                  className="rounded-full border border-brand-400/40 bg-brand-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-300"
                >
                  {node.label}
                </span>
              ))}
            </Reveal>

            <Reveal as="div" delay={0.1} className="flex flex-wrap gap-2.5">
              {secondaryConceptNodes.map((node) => (
                <span
                  key={node.id}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-ink-300"
                >
                  {node.label}
                </span>
              ))}
            </Reveal>
          </div>
        </Container>
      </div>
    </Section>
  );
}
