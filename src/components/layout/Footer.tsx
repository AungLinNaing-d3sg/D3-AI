import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Container } from "@/components/ui/Container";
import { footerNav } from "@/data/nav";
import { siteConfig } from "@/data/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-ink-950">
      <Container className="grid gap-12 py-16 md:grid-cols-[1.2fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-sm text-sm leading-relaxed text-ink-400">
            {siteConfig.description}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink-100">Explore</h3>
          <ul className="mt-4 space-y-3">
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-ink-400 transition-colors hover:text-brand-300">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink-100">Get in touch</h3>
          <address className="mt-4 space-y-2 text-sm not-italic text-ink-400">
            <p>{siteConfig.contactPerson.name}</p>
            <p>{siteConfig.contactPerson.role}</p>
            <p>
              {siteConfig.legalName} (UEN: {siteConfig.uen})
            </p>
            {siteConfig.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p>
              <a href={`tel:${siteConfig.phoneHref}`} className="transition-colors hover:text-brand-300">
                {siteConfig.phone}
              </a>
            </p>
            <p>
              <a href={`mailto:${siteConfig.email}`} className="transition-colors hover:text-brand-300">
                {siteConfig.email}
              </a>
            </p>
          </address>
        </div>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-col items-center justify-between gap-3 py-6 text-xs text-ink-400 sm:flex-row">
          <p>
            &copy; {year} {siteConfig.legalName}. All rights reserved.
          </p>
          <p>Built with Next.js.</p>
        </Container>
      </div>
    </footer>
  );
}
