import { contactNav, siteNav } from "@/data/home";
import { siteConfig } from "@/data/site";
import { FooterWordmark } from "./FooterWordmark";
import { InPageLink } from "./InPageLink";

/**
 * Dark footer panel that slides up over the pinned Contact section (see
 * MotionDirector). Section pills, direct contact details, the particle
 * wordmark, and a back-to-top pill.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="foot-panel">
        <div className="foot-top" data-foot-reveal>
          <nav className="foot-nav" aria-label="Footer">
            {[...siteNav, contactNav].map((item) => (
              <InPageLink key={item.href} className="pill pill-dark" href={item.href as `#${string}`}>
                {item.label}
              </InPageLink>
            ))}
          </nav>
          <address className="foot-contact">
            <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
            <a href={`tel:${siteConfig.phoneHref}`}>{siteConfig.phone}</a>
            <span>{siteConfig.addressLines.join(", ")}</span>
          </address>
        </div>
        <FooterWordmark />
        <div className="foot-bottom" data-foot-reveal>
          <span>
            © {new Date().getFullYear()} {siteConfig.legalName} · UEN {siteConfig.uen}
          </span>
          <InPageLink className="pill pill-dark" href="#hero">
            Back to top ↑
          </InPageLink>
        </div>
      </div>
    </footer>
  );
}
