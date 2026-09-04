import { render, screen } from "@testing-library/react";
import { HeroSection } from "@/components/sections/HeroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { ServicesSection } from "@/components/sections/ServicesSection";
import { SolutionsSection } from "@/components/sections/SolutionsSection";
import { ProjectsSection } from "@/components/sections/ProjectsSection";
import { TechnologySection } from "@/components/sections/TechnologySection";
import { TeamSection } from "@/components/sections/TeamSection";
import { CtaSection } from "@/components/sections/CtaSection";
import { siteConfig } from "@/data/site";

describe("homepage sections", () => {
  it("renders the hero headline, tagline, and both primary CTAs", () => {
    render(<HeroSection />);
    expect(screen.getByRole("heading", { level: 1, name: siteConfig.tagline })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /explore our services/i })).toHaveAttribute(
      "href",
      "#services"
    );
    expect(screen.getByRole("link", { name: /contact us/i })).toHaveAttribute("href", "#contact");
  });

  it.each([
    ["about", AboutSection, /who we are/i],
    ["services", ServicesSection, /our services/i],
    ["solutions", SolutionsSection, /capabilities/i],
    ["projects", ProjectsSection, /focus areas/i],
    ["technology", TechnologySection, /microsoft technologies/i],
    ["company", TeamSection, /team behind the technology/i],
  ] as const)("section #%s exposes an accessible level-2 heading matching %s", (id, Component, pattern) => {
    render(<Component />);
    const section = document.getElementById(id);
    expect(section).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: pattern })).toBeInTheDocument();
  });

  it("lists the three solution pillars (Data, Dynamics, Digital) as the About chapter's identity list", () => {
    render(<AboutSection />);
    const list = screen.getByRole("list", { name: /three solution pillars/i });
    expect(list).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Data" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Dynamics" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Digital" })).toBeInTheDocument();
  });

  it("renders the final CTA with direct email and phone actions", () => {
    render(<CtaSection />);
    expect(screen.getByRole("link", { name: /email us/i })).toHaveAttribute(
      "href",
      `mailto:${siteConfig.email}`
    );
    expect(
      screen.getByRole("link", { name: (accessibleName) => accessibleName.includes(siteConfig.phone) })
    ).toHaveAttribute(
      "href",
      `tel:${siteConfig.phoneHref}`
    );
  });
});
