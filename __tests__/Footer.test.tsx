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
    expect(screen.getByText((_, node) => node?.textContent === `© ${year} ${siteConfig.legalName}. All rights reserved.`)).toBeInTheDocument();
  });
});
