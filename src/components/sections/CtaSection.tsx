import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { siteConfig } from "@/data/site";

/**
 * Chapter 7 — Final CTA. Deliberately the most minimal section on the page:
 * a single centred message and two direct contact actions, mirroring the
 * 3D scene settling to a single, calm focal point (see sceneKeyframes[7]
 * in lib/motion/sceneState.ts).
 */
export function CtaSection() {
  return (
    <section
      id="contact"
      data-scene-section
      aria-labelledby="cta-heading"
      className="relative z-10 flex min-h-[80vh] items-center py-24 sm:py-32"
    >
      <Container className="flex flex-col items-center gap-8 text-center">
        <Reveal as="p" className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-400">
          Let&rsquo;s talk
        </Reveal>

        <Reveal
          as="h2"
          delay={0.05}
          id="cta-heading"
          className="text-balance font-display text-3xl font-semibold tracking-tight text-ink-50 sm:text-5xl lg:text-6xl"
        >
          Creating an AI infused future, together with you.
        </Reveal>

        <Reveal
          as="p"
          delay={0.1}
          className="max-w-lg text-balance text-base leading-relaxed text-ink-300 sm:text-lg"
        >
          Speak with {siteConfig.contactPerson.name}, {siteConfig.contactPerson.role}, about your next
          Data, Dynamics, or Digital initiative.
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
    </section>
  );
}
