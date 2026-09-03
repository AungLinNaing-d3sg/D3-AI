import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LinkButton } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { brandPillars } from "@/data/pillars";

interface WhoWeAreSectionProps {
  /** Show the "Read our full story" CTA (hidden on the About page itself). */
  showCta?: boolean;
}

export function WhoWeAreSection({ showCta = true }: WhoWeAreSectionProps) {
  return (
    <section className="py-20 sm:py-28">
      <Container className="grid gap-14 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <SectionHeading
            eyebrow="Who we are"
            title="A Singapore-based partner for your IT transformation"
            description={
              <>
                We are a Singapore-based IT solutions provider focused on three solution areas:
                Data (Analytics, Machine Learning &amp; AI), Dynamics (365 &amp; Power Platform),
                and Digital (Development). Working alongside partners who offer complementary,
                value-added services, we help organisations serve their varied IT transformation
                needs end-to-end.
              </>
            }
          />
          {showCta ? (
            <div className="mt-8">
              <LinkButton href="/about" variant="secondary">
                Read our full story
              </LinkButton>
            </div>
          ) : null}
        </Reveal>

        <Reveal delayMs={120} className="grid grid-cols-2 gap-4">
          {brandPillars.map((pillar) => (
            <div
              key={pillar.label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-brand-400/40"
            >
              <p className="text-2xl font-semibold text-brand-300">{pillar.value}</p>
              <p className="mt-1 text-sm font-medium text-ink-100">{pillar.label}</p>
              <p className="mt-2 text-xs leading-relaxed text-ink-400">{pillar.description}</p>
            </div>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
