import { fireEvent, render, screen, within } from "@testing-library/react";
import { IntroSection } from "@/components/sections/IntroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { TypographySection } from "@/components/sections/TypographySection";
import { NeuralSection } from "@/components/sections/NeuralSection";
import { UniverseSection } from "@/components/sections/UniverseSection";
import { GameSection } from "@/components/sections/GameSection";
import { FutureSection } from "@/components/sections/FutureSection";
import { CtaSection } from "@/components/sections/CtaSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { faqItems } from "@/data/faq";
import { processSteps } from "@/data/process";
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
    expect(document.getElementById("home")).toHaveAttribute("data-stage", "intro");
  });

  it("renders the hero's next steps", () => {
    render(<IntroSection />);
    expect(screen.getByRole("link", { name: /start a project/i })).toHaveAttribute("href", "#contact");
    expect(screen.getByRole("link", { name: /explore the journey/i })).toHaveAttribute("href", "#about");
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
    expect(screen.getByRole("heading", { level: 2, name: /real-world experience\. future-ready thinking\./i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /the people behind the work/i })).toBeInTheDocument();
    expect(screen.getByText(aboutPartnerNote)).toBeInTheDocument();
    ["Microsoft-focused", "Certified leadership", "Sector experience", "Partner ecosystem"].forEach((value) => {
      expect(screen.getByRole("heading", { level: 3, name: value })).toBeInTheDocument();
    });
    teamMembers.forEach((member) => {
      expect(screen.getByRole("heading", { level: 3, name: member.name })).toBeInTheDocument();
      expect(screen.getAllByText(member.role).length).toBeGreaterThan(0);
      member.bio.forEach((line) => {
        expect(screen.getByText(line)).toBeInTheDocument();
      });
    });
  });

  it("renders exactly one team roster card per real team member, each starting inactive", () => {
    render(<AboutSection />);
    const cards = teamMembers.map((member) => screen.getByRole("article", { name: member.name }));
    expect(cards).toHaveLength(teamMembers.length);
    cards.forEach((card) => {
      expect(card).toHaveAttribute("data-active", "false");
    });
  });

  it("renders the typography chapter's discipline cards accessibly, independent of the 3D sphere", () => {
    render(<TypographySection />);
    expect(document.getElementById("approach")).toHaveAttribute("data-stage", "typography");
    expect(
      screen.getByRole("heading", { level: 2, name: "Three disciplines. One intelligent system." })
    ).toBeInTheDocument();
    services.forEach((service) => {
      expect(screen.getByRole("button", { name: new RegExp(`focus ${service.title}`, "i") })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 3, name: service.title })).toBeInTheDocument();
      service.bullets.forEach((bullet) => expect(screen.getByText(bullet)).toBeInTheDocument());
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
      const panel = screen.getByRole("article", { name: service.title });
      expect(panel).toHaveAttribute("data-active", "false");
      expect(within(panel).getByRole("button", { name: new RegExp(`focus ${service.title}`, "i") })).toBeInTheDocument();
    });
  });

  it("renders the neural network chapter with every technology node label", () => {
    render(<NeuralSection />);
    expect(document.getElementById("how-we-build")).toHaveAttribute("data-stage", "neural");
    technologyNetworkNodes.forEach((node) => {
      expect(screen.getByText(node.label)).toBeInTheDocument();
    });
  });

  it("renders the delivery process steps in order inside the How We Build chapter", () => {
    render(<NeuralSection />);
    const titles = screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent);
    expect(titles).toEqual(processSteps.map((step) => step.title));
    processSteps.forEach((step) => expect(screen.getByText(step.text)).toBeInTheDocument());
  });

  it("renders every FAQ as a native disclosure that opens on click", () => {
    render(<FaqSection />);
    expect(document.getElementById("faq")).toHaveAttribute("data-stage", "faq");
    expect(screen.getByRole("heading", { level: 2, name: /questions, answered/i })).toBeInTheDocument();
    const details = document.querySelectorAll("details");
    expect(details).toHaveLength(faqItems.length);
    const first = details[0]!;
    expect(first.open).toBe(false);
    fireEvent.click(within(first).getByText(faqItems[0].q));
    expect(first.open).toBe(true);
    expect(screen.getByRole("link", { name: /ask the team/i })).toHaveAttribute("href", "#contact");
  });

  it("keeps one FAQ answer open at a time", () => {
    render(<FaqSection />);
    const [first, second] = Array.from(document.querySelectorAll("details"));
    fireEvent.click(within(first!).getByText(faqItems[0].q));
    expect(first!.open).toBe(true);
    fireEvent.click(within(second!).getByText(faqItems[1].q));
    expect(second!.open).toBe(true);
    expect(first!.open).toBe(false);
    fireEvent.click(within(second!).getByText(faqItems[1].q));
    expect(second!.open).toBe(false);
  });

  it("renders the data universe chapter's real, sourced statistics", () => {
    render(<UniverseSection />);
    expect(document.getElementById("numbers")).toHaveAttribute("data-stage", "universe");
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
    expect(document.getElementById("playground")).toHaveAttribute("data-stage", "game");
    expect(screen.getByRole("heading", { level: 2, name: /ai engineering playground/i })).toBeInTheDocument();
    expect(screen.getByText("06 — AI Playground")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play experience — choose your ai agent/i })).toBeInTheDocument();
    playgroundExperiences.forEach((experience) => {
      expect(screen.getByRole("heading", { level: 3, name: experience.title })).toBeInTheDocument();
    });
  });

  it("renders the cinematic future chapter's vision statement", () => {
    render(<FutureSection />);
    expect(document.getElementById("vision")).toHaveAttribute("data-stage", "future");
    expect(screen.getByRole("heading", { level: 2, name: siteConfig.tagline })).toBeInTheDocument();
  });

  it("renders the final CTA with direct email and phone actions", () => {
    render(<CtaSection />);
    expect(document.getElementById("contact")).toHaveAttribute("data-stage", "cta");
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
    expect(screen.getByText("09 — Let’s talk")).toHaveClass("type-eyebrow");
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
