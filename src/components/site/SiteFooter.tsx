import { siteNav } from "@/data/home";
import { siteConfig } from "@/data/site";
import { InPageLink } from "./InPageLink";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="foot">
        <span>
          © {siteConfig.legalName} · UEN {siteConfig.uen}
        </span>
        <nav aria-label="Footer">
          {siteNav.map((item) => (
            <InPageLink key={item.href} href={item.href as `#${string}`}>
              {item.label}
            </InPageLink>
          ))}
        </nav>
      </div>
    </footer>
  );
}
