import { Container } from "@/components/ui/Container";
import { GradientBackdrop } from "@/components/ui/GradientBackdrop";
import { LinkButton } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-28 sm:pt-28 sm:pb-36">
      <GradientBackdrop variant="hero" />

      <Container className="relative flex flex-col items-center text-center">
        <Reveal className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-ink-200 uppercase backdrop-blur">
          Singapore &middot; Data, Dynamics &amp; Digital
        </Reveal>

        <Reveal delayMs={80} as="h1" className="mt-8 max-w-4xl text-balance text-4xl font-semibold tracking-tight text-ink-50 sm:text-6xl">
          Creating an <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500 bg-clip-text text-transparent">AI infused future</span> together with you
        </Reveal>

        <Reveal delayMs={160} as="p" className="mt-6 max-w-2xl text-balance text-base leading-relaxed text-ink-300 sm:text-lg">
          D3-SG partners with organisations across Data & AI, Microsoft Dynamics 365 & Power
          Platform, and Digital application development &mdash; turning ambitious ideas into
          production-grade outcomes.
        </Reveal>

        <Reveal delayMs={240} className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <LinkButton href="/contact">Start a conversation</LinkButton>
          <LinkButton href="/services" variant="secondary">
            Explore our services
          </LinkButton>
        </Reveal>
      </Container>
    </section>
  );
}
