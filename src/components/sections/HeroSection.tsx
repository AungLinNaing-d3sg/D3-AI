import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { siteConfig } from "@/data/site";

/**
 * Full-screen hero — chapter 0 of the scroll story. The immersive backdrop
 * is the shared `<SceneCanvas>` (mounted once in layout.tsx, positioned
 * fixed behind every section); this component only contributes real HTML
 * content and the scroll-to-explore affordance.
 */
export function HeroSection() {
  return (
    <section
      id="hero"
      data-scene-section
      aria-labelledby="hero-heading"
      className="relative z-10 flex min-h-[100svh] items-center"
    >
      <Container className="flex flex-col gap-8">
        <Reveal
          as="p"
          className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-400"
        >
          {siteConfig.name} · Singapore
        </Reveal>

        <Reveal
          as="h1"
          delay={0.05}
          id="hero-heading"
          className="text-balance font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink-50 sm:text-6xl lg:text-7xl"
        >
          {siteConfig.tagline}
        </Reveal>

        <Reveal
          as="p"
          delay={0.15}
          className="max-w-xl text-balance text-base leading-relaxed text-ink-300 sm:text-lg"
        >
          {siteConfig.description}
        </Reveal>

        <Reveal delay={0.25} className="flex flex-wrap items-center gap-4">
          <LinkButton href="#services" variant="primary">
            Explore our services
          </LinkButton>
          <LinkButton href="#contact" variant="secondary">
            Contact us
          </LinkButton>
        </Reveal>
      </Container>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-10 flex flex-col items-center gap-2 text-ink-400"
      >
        <span className="text-[0.65rem] font-medium uppercase tracking-[0.3em]">Scroll to explore</span>
        <span className="h-9 w-5 rounded-full border border-ink-400/60 p-1">
          <span className="block h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400" />
        </span>
      </div>
    </section>
  );
}
