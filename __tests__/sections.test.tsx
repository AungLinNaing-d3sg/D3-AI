import { render, screen } from "@testing-library/react";
import { IntroSection } from "@/components/sections/IntroSection";
import { TypographySection } from "@/components/sections/TypographySection";
import { NeuralSection } from "@/components/sections/NeuralSection";
import { UniverseSection } from "@/components/sections/UniverseSection";
import { ProductSection } from "@/components/sections/ProductSection";
import { GameSection } from "@/components/sections/GameSection";
import { FutureSection } from "@/components/sections/FutureSection";
import { CtaSection } from "@/components/sections/CtaSection";
import { siteConfig } from "@/data/site";
import { primaryConceptNodes, universeStats } from "@/data/journey";

describe("homepage chapters", () => {
  it("renders the intro hero headline and tagline as the page's h1", () => {
    render(<IntroSection />);
    expect(screen.getByRole("heading", { level: 1, name: siteConfig.tagline })).toBeInTheDocument();
    expect(document.getElementById("intro")).toHaveAttribute("data-stage", "intro");
  });

  it("renders the typography chapter's word list accessibly, independent of the 3D particle formation", () => {
    render(<TypographySection />);
    expect(document.getElementById("typography")).toHaveAttribute("data-stage", "typography");
    expect(screen.getByRole("heading", { level: 2, name: "D3-SG" })).toBeInTheDocument();
    expect(screen.getByText("AI", { selector: "p" })).toBeInTheDocument();
  });

  it("renders the neural network chapter with every concept and technology node label", () => {
    render(<NeuralSection />);
    expect(document.getElementById("neural")).toHaveAttribute("data-stage", "neural");
    primaryConceptNodes.forEach((node) => {
      expect(screen.getByText(node.label)).toBeInTheDocument();
    });
  });

  it("renders the data universe chapter's real, sourced statistics", () => {
    render(<UniverseSection />);
    expect(document.getElementById("universe")).toHaveAttribute("data-stage", "universe");
    universeStats.forEach((stat) => {
      expect(screen.getByText(stat.token)).toBeInTheDocument();
    });
  });

  it("renders the product experience chapter's three real service panels", () => {
    render(<ProductSection />);
    expect(document.getElementById("product")).toHaveAttribute("data-stage", "product");
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("renders the mini-game chapter with a clear Play/Skip choice", () => {
    render(<GameSection />);
    expect(document.getElementById("game")).toHaveAttribute("data-stage", "game");
    expect(screen.getByRole("button", { name: /^play$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^skip$/i })).toBeInTheDocument();
  });

  it("renders the cinematic future chapter's vision statement", () => {
    render(<FutureSection />);
    expect(document.getElementById("future")).toHaveAttribute("data-stage", "future");
    expect(screen.getByRole("heading", { level: 2, name: siteConfig.tagline })).toBeInTheDocument();
  });

  it("renders the final CTA with direct email and phone actions", () => {
    render(<CtaSection />);
    expect(document.getElementById("cta")).toHaveAttribute("data-stage", "cta");
    expect(screen.getByRole("link", { name: /email us/i })).toHaveAttribute(
      "href",
      `mailto:${siteConfig.email}`
    );
    expect(
      screen.getByRole("link", { name: (accessibleName) => accessibleName.includes(siteConfig.phone) })
    ).toHaveAttribute("href", `tel:${siteConfig.phoneHref}`);
  });
});
