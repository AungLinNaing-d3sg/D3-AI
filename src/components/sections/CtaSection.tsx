import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { Section } from "@/components/ui/Section";
import { siteConfig } from "@/data/site";

/**
 * Chapter 09 — Final CTA. Deliberately the most minimal chapter on the
 * page: a single centred message and two direct contact actions, mirroring
 * the 3D scene settling to one calm glow (see three/scenes/CtaScene.tsx).
 */
export function CtaSection() {
  return (
    <Section stageId="cta" ariaLabelledBy="cta-heading" className="flex min-h-[100svh] items-center py-24 sm:py-32">
      <Container className="flex flex-col items-center gap-8 text-center">
        <Reveal as="p" className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-400">
          09 — Let&rsquo;s talk
        </Reveal>

        <Reveal
          as="h2"
          delay={0.05}
          id="cta-heading"
          className="text-balance font-display text-4xl font-semibold tracking-tight text-ink-50 sm:text-6xl lg:text-7xl"
        >
          Build the future with AI.
        </Reveal>

        <Reveal
          as="p"
          delay={0.1}
          className="max-w-lg text-balance text-base leading-relaxed text-ink-300 sm:text-lg"
        >
          {siteConfig.description}
        </Reveal>

        <Reveal delay={0.18} className="flex flex-wrap items-center justify-center gap-4">
          <LinkButton href={`mailto:${siteConfig.email}`} variant="primary">
            Email us
          </LinkButton>
          <LinkButton href={`tel:${siteConfig.phoneHref}`} variant="secondary">
            Call {siteConfig.phone}
          </LinkButton>
        </Reveal>

        <Reveal delay={0.24} className="text-xs text-ink-500">
          {siteConfig.legalName} (UEN: {siteConfig.uen}) · {siteConfig.addressLines.join(", ")}
        </Reveal>
      </Container>
    </Section>
  );
}
