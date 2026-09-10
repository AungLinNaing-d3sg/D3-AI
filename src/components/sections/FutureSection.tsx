import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { visionPillars } from "@/data/journey";
import { siteConfig } from "@/data/site";

/**
 * Chapter 08 — Cinematic AI Future. The mini-game hands off into a calmer,
 * atmospheric 3D vista (three/scenes/FutureScene.tsx); this layer carries
 * the company's own forward-looking narration, grounded in the real
 * delivery capabilities (src/data/capabilities.ts) rather than invented
 * claims.
 */
export function FutureSection() {
  return (
    <Section
      stageId="future"
      ariaLabelledBy="future-heading"
      className="min-h-[85vh] md:min-h-[100vh] lg:min-h-[120vh]"
    >
      {/* Pinned only from tablet up — see IntroSection for why mobile flows
          normally instead of holding a full-screen pin. */}
      <div className="relative flex h-auto flex-col justify-center gap-10 py-12 md:sticky md:top-0 md:h-[100svh] md:gap-14 md:py-24 lg:py-28">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            headingId="future-heading"
            eyebrow="08 — Our vision"
            title={siteConfig.tagline}
            description="Not a distant promise — the same three disciplines you just walked through, carried forward."
          />

          <ul className="grid gap-6 sm:grid-cols-3">
            {visionPillars.map((pillar, index) => (
              <li key={pillar.title}>
                <Reveal as="div" delay={index * 0.08}>
                  <p className="font-display text-base font-semibold text-ink-50">{pillar.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-300">{pillar.description}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </div>
    </Section>
  );
}
