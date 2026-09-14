import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { services } from "@/data/services";

/** Matches the floating 3D dashboard panels' own accent colours (see
 * `PANEL_ACCENTS` in three/scenes/ProductScene.tsx) so the real, accessible
 * card and its decorative 3D counterpart always read as the same themed
 * pair. */
const CARD_ACCENTS = ["#22d3ee", "#fd6a50", "#67e8f9"] as const;

/**
 * Chapter 06 — AI Product Experience. The floating 3D dashboards live in the
 * shared canvas (three/scenes/ProductScene.tsx, decorative/aria-hidden); the
 * real, accessible product content — the three actual service pillars from
 * src/data/services.ts — flows normally beneath the pinned intro so it's
 * always keyboard/screen-reader reachable, not just visually implied.
 */
export function ProductSection() {
  return (
    <Section
      stageId="product"
      ariaLabelledBy="product-heading"
      className="min-h-[75vh] md:min-h-[90vh] lg:min-h-[105vh]"
    >
      {/* Pinned only from tablet up — see IntroSection for why mobile flows
          normally instead of holding a full-screen pin. */}
      <div className="relative flex h-auto items-center py-10 md:sticky md:top-0 md:min-h-[100svh] md:py-16 lg:py-20">
        <Container>
          <SectionHeading
            headingId="product-heading"
            eyebrow="06 — Step inside the product"
            title="One platform, three disciplines"
            description="Data, Dynamics, and Digital capabilities come together as a single working environment — previewed behind this section as floating, interactive panels."
          />
        </Container>
      </div>

      <Container className="relative z-10 grid gap-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service, index) => {
          const accent = CARD_ACCENTS[index % CARD_ACCENTS.length] ?? "#fd6a50";
          return (
            <Reveal key={service.slug} as="div" delay={index * 0.06}>
              {/* Angled, cut-corner panel with a glowing accent edge instead
                  of a plain rounded rectangle. */}
              <article
                className="relative flex h-full flex-col gap-4 overflow-hidden border border-white/10 bg-white/[0.03] p-7 pl-8"
                style={{
                  clipPath:
                    "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 22px 100%, 0 calc(100% - 22px))",
                }}
              >
                <span
                  className="absolute inset-y-0 left-0 w-1"
                  style={{ backgroundColor: accent }}
                  aria-hidden="true"
                />
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-3xl"
                  style={{ backgroundColor: accent }}
                  aria-hidden="true"
                />
                <ServiceIcon name={service.icon} className="relative h-8 w-8" style={{ color: accent }} />
                <h3 className="relative font-display text-lg font-semibold text-ink-50">{service.title}</h3>
                <p className="relative text-sm leading-relaxed text-ink-300">{service.summary}</p>
                <ul className="relative mt-auto flex flex-col gap-2 border-t border-white/10 pt-4">
                  {service.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-xs text-ink-400">
                      <span
                        className="mt-1 h-1 w-1 flex-none rounded-full"
                        style={{ backgroundColor: accent }}
                        aria-hidden="true"
                      />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          );
        })}
      </Container>
    </Section>
  );
}
