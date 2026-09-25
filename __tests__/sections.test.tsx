import { fireEvent, render, screen } from "@testing-library/react";
import { IntroSection } from "@/components/sections/IntroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { TypographySection } from "@/components/sections/TypographySection";
import { NeuralSection } from "@/components/sections/NeuralSection";
import { UniverseSection } from "@/components/sections/UniverseSection";
import { GameSection } from "@/components/sections/GameSection";
import { FutureSection } from "@/components/sections/FutureSection";
import { CtaSection } from "@/components/sections/CtaSection";
import { siteConfig } from "@/data/site";
import {
  heroPipelineNodes,
  technologyNetworkNodes,
  universeStats,
  universeStations,
  aboutPartnerNote,
  playgroundExperiences,
} from "@/data/journey";
import { teamMembers } from "@/data/team";
import { services } from "@/data/services";
import { disciplineFocus, resetDisciplineFocus } from "@/lib/motion/disciplineFocus";

describe("homepage chapters", () => {
  it("renders the intro hero headline and tagline as the page's h1", () => {
    render(<IntroSection />);
    expect(screen.getByRole("heading", { level: 1, name: siteConfig.tagline })).toBeInTheDocument();
    expect(document.getElementById("intro")).toHaveAttribute("data-stage", "intro");
  });

  it("renders the hero pipeline stages accessibly in the intro chapter", () => {
    render(<IntroSection />);
    heroPipelineNodes.forEach((node) => {
      expect(screen.getByText(node.label)).toBeInTheDocument();
    });
  });

  it("never renders the hero pipeline stages in the neural network chapter", () => {
    render(<NeuralSection />);
    heroPipelineNodes.forEach((node) => {
      expect(screen.queryAllByText(node.label)).toHaveLength(0);
    });
  });

  it("renders the about-us chapter with the real, sourced leadership team", () => {
    render(<AboutSection />);
    expect(document.getElementById("about")).toHaveAttribute("data-stage", "about");
    expect(screen.getByRole("heading", { level: 2, name: "Who we are" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /meet the team/i })).toBeInTheDocument();
    expect(screen.getByText(aboutPartnerNote)).toBeInTheDocument();
    teamMembers.forEach((member) => {
      expect(screen.getByText(member.name)).toBeInTheDocument();
      expect(screen.getByText(member.role)).toBeInTheDocument();
      member.bio.forEach((line) => {
        expect(screen.getByText(line)).toBeInTheDocument();
      });
    });
  });

  it("renders exactly one team roster card per real team member, each starting inactive", () => {
    render(<AboutSection />);
    const cards = screen.getAllByText(/chief/i).map((el) => el.closest("li"));
    expect(cards).toHaveLength(teamMembers.length);
    cards.forEach((card) => {
      expect(card).toHaveAttribute("data-active", "false");
    });
  });

  it("renders the typography chapter's discipline cards accessibly, independent of the 3D sphere", () => {
    render(<TypographySection />);
    expect(document.getElementById("typography")).toHaveAttribute("data-stage", "typography");
    expect(
      screen.getByRole("heading", { level: 2, name: "Three disciplines, one intelligent system" })
    ).toBeInTheDocument();
    services.forEach((service) => {
      expect(screen.getByRole("button", { name: new RegExp(`focus ${service.title}`, "i") })).toBeInTheDocument();
      expect(screen.getByText(service.title)).toBeInTheDocument();
    });
  });

  it("never changes the active discipline on hover — only a click selects one", () => {
    render(<TypographySection />);
    const [first, second] = services.map((service) =>
      screen.getByRole("button", { name: new RegExp(`focus ${service.title}`, "i") })
    );
    fireEvent.mouseEnter(first!);
    fireEvent.mouseOver(first!);
    fireEvent.focus(first!);
    expect(disciplineFocus.pinned).toBeNull();
    fireEvent.click(second!);
    expect(disciplineFocus.pinned).toBe(1);
    resetDisciplineFocus();
  });

  it("starts every discipline card inactive", () => {
    render(<TypographySection />);
    services.forEach((service) => {
      const button = screen.getByRole("button", { name: new RegExp(`focus ${service.title}`, "i") });
      expect(button).toHaveAttribute("data-active", "false");
    });
  });

  it("renders the neural network chapter with every technology node label", () => {
    render(<NeuralSection />);
    expect(document.getElementById("neural")).toHaveAttribute("data-stage", "neural");
    technologyNetworkNodes.forEach((node) => {
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

  it("gives every data universe stat card an accessible caption of the shared decorative 3D scene", () => {
    render(<UniverseSection />);
    const cards = screen.getAllByRole("listitem");
    expect(cards).toHaveLength(universeStations.length);

    // One shared 3D backdrop (a live coding terminal, not a per-statistic
    // composition — see three/scenes/UniverseScene.tsx) sits behind every
    // card now, so every card's caption is expected to be identical, not
    // unique per station.
    universeStations.forEach((station) => {
      const statNode = screen.getByText(station.stat.token);
      const card = statNode.closest("li");
      expect(card).not.toBeNull();
      // The real, sourced statistic copy (label + description) must still be
      // present and visible alongside the sr-only 3D caption — the caption
      // supplements, never replaces, the primary accessible content.
      expect(card).toHaveTextContent(station.stat.label);
      expect(card).toHaveTextContent(station.stat.description);

      const caption = card?.querySelector(".sr-only");
      expect(caption).not.toBeNull();
      expect(caption?.textContent).toMatch(/^3D scene:/);
    });
  });

  it("renders the AI Engineering Playground chapter as live system modules, one per real experience", () => {
    render(<GameSection />);
    expect(document.getElementById("game")).toHaveAttribute("data-stage", "game");
    expect(screen.getByRole("heading", { level: 2, name: /ai engineering playground/i })).toBeInTheDocument();
    expect(screen.getByText("06 — AI Playground")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play experience — choose your ai agent/i })).toBeInTheDocument();
    playgroundExperiences.forEach((experience) => {
      expect(screen.getByRole("heading", { level: 3, name: experience.title })).toBeInTheDocument();
    });
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

  it("closes the journey with the standard section header system", () => {
    render(<CtaSection />);
    expect(screen.getByText("08 — Let’s talk")).toHaveClass("type-eyebrow");
    const heading = screen.getByRole("heading", { level: 2, name: "Let’s build what’s next." });
    expect(heading).toHaveClass("type-display-section");
    expect(screen.getByText(/have an idea, a challenge, or a vision/i)).toBeInTheDocument();
  });

  it("shows the compact message form open by default — no click needed", () => {
    render(<CtaSection />);
    expect(screen.queryByRole("button", { name: /start a conversation/i })).not.toBeInTheDocument();
    const form = screen.getByRole("form", { name: /send us a message/i });
    expect(form).toBeVisible();
    expect(screen.getByLabelText(/^name/i)).toBeVisible();
    expect(screen.getByLabelText(/^email/i)).toBeVisible();
    expect(screen.getByLabelText(/^message/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
  });
});
