import { render, screen, within } from "@testing-library/react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { contactNav, siteNav } from "@/data/home";
import { siteConfig } from "@/data/site";

describe("SiteFooter", () => {
  it("links to every section as pills", () => {
    render(<SiteFooter />);
    const nav = screen.getByRole("navigation", { name: "Footer" });
    [...siteNav, contactNav].forEach((item) => {
      expect(within(nav).getByRole("link", { name: item.label })).toHaveAttribute("href", item.href);
    });
  });

  it("shows the real contact details", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: siteConfig.email })).toHaveAttribute("href", `mailto:${siteConfig.email}`);
    expect(screen.getByRole("link", { name: siteConfig.phone })).toHaveAttribute("href", `tel:${siteConfig.phoneHref}`);
    expect(screen.getByText(new RegExp(`UEN ${siteConfig.uen}`))).toBeInTheDocument();
  });

  it("keeps the particle wordmark readable by assistive tech", () => {
    render(<SiteFooter />);
    expect(screen.getByText("D3-SG")).toHaveClass("sr-only");
    expect(document.querySelector(".foot-wordmark canvas")).toHaveAttribute("aria-hidden", "true");
  });

  it("offers a way back to the top", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: /back to top/i })).toHaveAttribute("href", "#hero");
  });
});
