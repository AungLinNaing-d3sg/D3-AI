import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { visionPillars } from "@/data/journey";
import { siteConfig } from "@/data/site";

/**
 * Chapter 07 — Cinematic AI Future. The mini-game hands off into a calmer,
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
      className="min-h-[75vh] md:min-h-[90vh] lg:min-h-[105vh]"
    >
      {/* Pinned only from tablet up — see IntroSection for why mobile flows
          normally instead of holding a full-screen pin. */}
      <div className="relative flex h-auto flex-col justify-center gap-8 py-10 md:sticky md:top-0 md:min-h-[100svh] md:gap-10 md:py-16 lg:py-20">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            headingId="future-heading"
            eyebrow="07 — Our vision"
            title={siteConfig.tagline}
            description="Not a distant promise — the same three disciplines you just walked through, carried forward."
          />

          {/* Deliberately not a card grid — a circular number badge plus a
              thin accent rule instead of a bordered box, so this chapter
              reads as its own composition rather than another rectangle. */}
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {visionPillars.map((pillar, index) => (
              <li key={pillar.title} className="flex gap-4">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-brand-400/30 bg-brand-500/5 font-mono text-xs font-bold text-brand-300">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Reveal as="div" delay={index * 0.08} className="flex-1 border-l border-white/10 pl-4">
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
