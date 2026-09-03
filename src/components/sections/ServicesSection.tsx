import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { TiltCard } from "@/components/ui/TiltCard";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { services } from "@/data/services";
import type { Service } from "@/types";

interface ServicesSectionProps {
  /** "preview" truncates the bullet list (used on the homepage teaser). */
  variant?: "preview" | "full";
  headingId?: string;
}

const PREVIEW_BULLET_COUNT = 3;

function ServiceCard({ service, variant }: { service: Service; variant: "preview" | "full" }) {
  const bullets = variant === "preview" ? service.bullets.slice(0, PREVIEW_BULLET_COUNT) : service.bullets;

  return (
    <TiltCard className="flex flex-col gap-5">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
        <ServiceIcon name={service.icon} />
      </span>
      <div>
        <h3 className="text-lg font-semibold text-ink-50">{service.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-400">{service.summary}</p>
      </div>
      <ul className="mt-auto space-y-2.5 border-t border-white/10 pt-5 text-sm text-ink-300">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2.5">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-brand-400"
            >
              <path
                fillRule="evenodd"
                d="M16.7 5.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4L9 11.6l6.3-6.3a1 1 0 0 1 1.4 0Z"
                clipRule="evenodd"
              />
            </svg>
            <span>{bullet}</span>
          </li>
        ))}
        {variant === "preview" && service.bullets.length > PREVIEW_BULLET_COUNT ? (
          <li className="text-xs font-medium text-ink-400">
            +{service.bullets.length - PREVIEW_BULLET_COUNT} more
          </li>
        ) : null}
      </ul>
    </TiltCard>
  );
}

export function ServicesSection({ variant = "full", headingId = "services-heading" }: ServicesSectionProps) {
  return (
    <section className="py-20 sm:py-28" aria-labelledby={headingId}>
      <Container className="flex flex-col gap-14">
        <Reveal>
          <SectionHeading
            id={headingId}
            align="center"
            eyebrow="Our services"
            title="Revolving around Microsoft technologies"
            description="These are the pillars of our service portfolio — built to take you from strategy through to a running, supported solution."
          />
        </Reveal>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {services.map((service, index) => (
            <Reveal key={service.slug} as="li" delayMs={index * 100} className="h-full">
              <ServiceCard service={service} variant={variant} />
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
