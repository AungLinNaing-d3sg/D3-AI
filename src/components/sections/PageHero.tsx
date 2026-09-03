import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { GradientBackdrop } from "@/components/ui/GradientBackdrop";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  description?: string;
  currentLabel: string;
}

/** Compact banner used at the top of every non-home page, with a breadcrumb. */
export function PageHero({ eyebrow, title, description, currentLabel }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden pt-16 pb-16 sm:pt-24 sm:pb-20">
      <GradientBackdrop />
      <Container className="relative flex flex-col items-start gap-4">
        <span className="text-xs font-semibold tracking-wide text-brand-400 uppercase">{eyebrow}</span>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-ink-50 sm:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-balance text-base leading-relaxed text-ink-300 sm:text-lg">
            {description}
          </p>
        ) : null}
        <nav aria-label="Breadcrumb" className="pt-2 text-sm text-ink-400">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="transition-colors hover:text-brand-300">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink-200">
              {currentLabel}
            </li>
          </ol>
        </nav>
      </Container>
    </section>
  );
}
