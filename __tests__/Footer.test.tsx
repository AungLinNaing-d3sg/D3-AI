import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/layout/Footer";
import { siteConfig } from "@/data/site";

describe("Footer", () => {
  it("renders the company contact details from the shared site config", () => {
    render(<Footer />);
    expect(screen.getAllByText(siteConfig.legalName, { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: siteConfig.email })).toHaveAttribute(
      "href",
      `mailto:${siteConfig.email}`
    );
    expect(screen.getByRole("link", { name: siteConfig.phone })).toHaveAttribute(
      "href",
      `tel:${siteConfig.phoneHref}`
    );
  });

  it("renders the current year in the copyright line", () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText((_, node) => node?.tagName === "SPAN" && node.textContent === `© ${year} ${siteConfig.legalName} · UEN ${siteConfig.uen}`)).toBeInTheDocument();
  });

  it("carries no section menu, only the project CTA and a way back to the top", () => {
    render(<Footer />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start a project/i })).toHaveAttribute("href", "#contact");
    expect(screen.getByRole("link", { name: /back to top/i })).toHaveAttribute("href", "#home");
  });

  it("keeps the particle wordmark readable by assistive tech", () => {
    render(<Footer />);
    expect(screen.getByText("D3-SG")).toHaveClass("sr-only");
    expect(document.querySelector(".foot-wordmark canvas")).toHaveAttribute("aria-hidden", "true");
  });
});
