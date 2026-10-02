import { contactNav, siteNav } from "@/data/home";
import { siteConfig } from "@/data/site";
import { InPageLink } from "./InPageLink";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span className="wordmark" aria-hidden="true" data-anim="wordmark">
        D3-SG
      </span>
      <div className="foot">
        <span>
          © {siteConfig.legalName} · UEN {siteConfig.uen}
        </span>
        <nav aria-label="Footer">
          {[...siteNav, contactNav].map((item) => (
            <InPageLink key={item.href} href={item.href as `#${string}`}>
              {item.label}
            </InPageLink>
          ))}
        </nav>
      </div>
    </footer>
  );
}
