import type { CSSProperties } from "react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/motion/Reveal";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ContactForm } from "@/components/sections/ContactForm";
import { CtaStage } from "@/components/sections/CtaStage";
import { CtaStartLink } from "@/components/sections/CtaStartLink";
import { siteConfig } from "@/data/site";

/** The story the intelligence core tells as the section scrolls in — each
 * step lights as the core reaches it (see `.cta-story-step` in globals.css,
 * driven by the same `--cta-progress` as the 3D scene). */
const STORY_STEPS = ["Data", "Connection", "Intelligence", "Creation"] as const;

/**
 * Chapter 08 — the closing chapter: every system the journey introduced
 * (data, dynamics, digital, AI, systems, capabilities) converging into one
 * intelligence, then into what gets built next.
 *
 * Layers, back to front: the studio environment, atmosphere and supporting
 * structures, and the 3D intelligence core (all in `<CtaStage>` — see
 * three/scenes/CtaScene.tsx); then the HTML content; then its micro
 * details. The core is framed to the right on desktop (held in frame while
 * the form scrolls past), top right on tablet, and cropped
 * into the top right on mobile. Its scroll story — enter, connect,
 * intelligence, complete — runs on this section's own scroll progress.
 *
 * The content (`data-cta-content`) is an asymmetric left column in normal
 * document flow, in two beats: the statement (metadata, heading, copy, the
 * primary CTA with direct links, the story steps) filling the first screen,
 * then the message form — open by default — as a compact floating console.
 * Wherever the scene passes behind the content it is dimmed, desaturated,
 * thinned and defocused in its shaders, so the copy always stays the
 * primary layer — no giant panel over the scene.
 */
export function CtaSection() {
  return (
    <Section
      stageId="cta"
      ariaLabelledBy="cta-heading"
      className="overflow-hidden"
    >
      <CtaStage />

      <div className="relative pb-14 pt-[16.5rem] sm:pt-[19.5rem] md:pb-16 md:pt-[10rem] lg:pb-24 lg:pt-0">
        <Container className="relative">
          <div
            data-cta-content
            className="relative w-full max-w-xl lg:max-w-[34rem]"
          >
            <div className="flex flex-col gap-7 md:max-w-[23rem] lg:min-h-[100svh] lg:max-w-none lg:justify-center lg:pb-16 lg:pt-28">
              <SectionHeading
                headingId="cta-heading"
                eyebrow="08 — Let’s talk"
                title="Let’s build what’s next."
                description="Have an idea, a challenge, or a vision for what comes next? Let’s turn it into something real — together."
              />

              <Reveal delay={0.15} variant="blur" blur={4} y={8} duration={0.5}>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                  <CtaStartLink href="#cta-contact" focusId="contact-name" />
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-300">
                    <a
                      href={`mailto:${siteConfig.email}`}
                      className="cta-quiet-link"
                    >
                      Email us
                    </a>
                    <span aria-hidden="true" className="text-ink-500">
                      ·
                    </span>
                    <a
                      href={`tel:${siteConfig.phoneHref}`}
                      className="cta-quiet-link"
                    >
                      Call {siteConfig.phone}
                    </a>
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.2} variant="blur" blur={4} y={8} duration={0.5}>
                <ol aria-label="From data to creation" className="cta-story">
                  {STORY_STEPS.map((step, index) => (
                    <li
                      key={step}
                      className="cta-story-step"
                      style={{ "--step": index } as CSSProperties}
                    >
                      {step}
                    </li>
                  ))}
                </ol>
              </Reveal>
            </div>

            <Reveal
              delay={0.1}
              variant="blur"
              blur={4}
              y={12}
              duration={0.6}
              className="mt-12 w-full md:mt-14 lg:mt-0"
            >
              <div id="cta-contact" className="cta-console scroll-mt-28">
                <div className="cta-console-head">
                  <h3 id="contact-form-heading" className="cta-console-title">
                    Send us a message
                  </h3>
                  <span aria-hidden="true" className="cta-console-status">
                    Channel open
                  </span>
                </div>
                <ContactForm />
              </div>
            </Reveal>
          </div>
        </Container>
      </div>
    </Section>
  );
}
