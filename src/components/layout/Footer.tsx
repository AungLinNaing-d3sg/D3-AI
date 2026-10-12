import { Reveal } from "@/components/motion/Reveal";
import { siteConfig } from "@/data/site";
import { FooterCover } from "./FooterCover";
import { FooterLink } from "./FooterLink";
import { FooterWordmark } from "./FooterWordmark";

const Arrow = () => (
  <svg className="foot-arrow" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M3 8h9.5M8.5 4l4 4-4 4" />
  </svg>
);

/**
 * Footer in the light redesign's style (development_v2): it swipes up over
 * the final chapter until it covers the screen (FooterCover). Hierarchy,
 * top to bottom: a headline call to action, a three-column strip of direct
 * contact details, the interactive particle "D3SG" wordmark, and a slim
 * legal bar. Section links live in the header, so the footer carries none.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-foot relative z-20">
      <FooterCover />
      <div className="site-foot-panel">
        <Reveal as="div" className="foot-cta">
          <p className="foot-cta-title">
            Have a project in mind? <span className="v2-accent">Let&apos;s build it together.</span>
          </p>
          <FooterLink href="#contact" className="foot-cta-button">
            Start a project <Arrow />
          </FooterLink>
        </Reveal>

        <Reveal as="div" delay={0.1}>
          <address className="foot-info">
            <div className="foot-info-item">
              <span className="foot-info-label">Email</span>
              <a className="foot-contact-big" href={`mailto:${siteConfig.email}`}>
                {siteConfig.email}
              </a>
            </div>
            <div className="foot-info-item">
              <span className="foot-info-label">Call</span>
              <a className="foot-contact-big" href={`tel:${siteConfig.phoneHref}`}>
                {siteConfig.phone}
              </a>
            </div>
            <div className="foot-info-item">
              <span className="foot-info-label">Visit</span>
              <span className="foot-contact-line">
                {siteConfig.addressLines[0]}
                <br />
                {siteConfig.addressLines[1]}
              </span>
            </div>
          </address>
        </Reveal>

        <FooterWordmark />

        {/* Not a <Reveal>: as the last element on the page it can never scroll
            high enough to trigger an entrance, so it would stay hidden. */}
        <div className="site-foot-bottom">
          <span>
            &copy; {year} {siteConfig.legalName} · UEN {siteConfig.uen}
          </span>
          <FooterLink href="#home">Back to top ↑</FooterLink>
        </div>
      </div>
    </footer>
  );
}
