import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/layout/Footer";
import { siteConfig } from "@/data/site";

describe("Footer", () => {
  it("renders company contact details from the shared site config", () => {
    render(<Footer />);

    expect(screen.getByText(siteConfig.contactPerson.name)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: siteConfig.email })
    ).toHaveAttribute("href", `mailto:${siteConfig.email}`);
    expect(
      screen.getByRole("link", { name: siteConfig.phone })
    ).toHaveAttribute("href", `tel:${siteConfig.phoneHref}`);
  });

  it("renders the current year in the copyright line", () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });

  it("exposes footer navigation links for keyboard/AT users", () => {
    render(<Footer />);
    expect(screen.getAllByRole("link").length).toBeGreaterThan(0);
  });
});
