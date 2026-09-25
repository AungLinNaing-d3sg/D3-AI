import { fireEvent, render, screen } from "@testing-library/react";
import { AiPlayground } from "@/components/game/AiPlayground";
import { playgroundExperiences } from "@/data/journey";

/**
 * Chapter 06's "AI Engineering Playground" orchestrator. Verifies the entry
 * system modules open their experiences (01 primary, 02–04 supporting),
 * that the experiences still chain as one connected pipeline with a
 * persistent chapter rail reflecting progress, and that
 * completing the pipeline reaches the "System ready" state with a working
 * restart — each experience's own internal flow is exercised by rendering it
 * directly below.
 */
describe("AiPlayground", () => {
  it("starts on the system modules: 01 as the primary experience, 02–04 as supporting ones", () => {
    render(<AiPlayground />);
    expect(screen.getByRole("list", { name: /playground experiences/i })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(playgroundExperiences.length);
    playgroundExperiences.forEach((experience) => {
      const action = experience.index === 1 ? "Play experience" : "Open experience";
      expect(screen.getByRole("button", { name: `${action} — ${experience.title}` })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 3, name: experience.title })).toBeInTheDocument();
    });
  });

  it("opens a supporting experience directly from its module", () => {
    render(<AiPlayground />);
    fireEvent.click(screen.getByRole("button", { name: "Open experience — Run the AI Workflow" }));
    expect(screen.getByRole("button", { name: /run the ai workflow — current chapter/i })).toBeInTheDocument();
  });

  it("entering the playground lands on Choose Your AI Agent with the chapter rail visible", () => {
    render(<AiPlayground />);
    fireEvent.click(screen.getByRole("button", { name: /play experience — choose your ai agent/i }));

    expect(screen.getByRole("heading", { level: 3, name: /meet the real agents behind this repo/i })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: /playground chapters/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /choose your ai agent — current chapter/i })).toBeInTheDocument();
  });

  it("exiting an experience returns to the entry chapter", () => {
    render(<AiPlayground />);
    fireEvent.click(screen.getByRole("button", { name: /play experience — choose your ai agent/i }));
    fireEvent.click(screen.getByRole("button", { name: /back to ai playground/i }));

    expect(screen.getByRole("button", { name: /play experience — choose your ai agent/i })).toBeInTheDocument();
  });

  it("selecting an agent reveals its real responsibility, advances to the workflow chapter, and marks the agent chapter done on the rail", () => {
    render(<AiPlayground />);
    fireEvent.click(screen.getByRole("button", { name: /play experience — choose your ai agent/i }));
    fireEvent.click(screen.getByRole("button", { name: /select senior-qa/i }));

    expect(screen.getAllByText(/writes and maintains unit, integration, and end-to-end tests/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /^next step$/i }));
    expect(screen.getByRole("heading", { level: 3, name: /scripts\/ai_workflow\.sh/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /choose your ai agent — completed/i })).toBeInTheDocument();
  });

  it("jumping back to a completed chapter via the rail works", () => {
    render(<AiPlayground />);
    fireEvent.click(screen.getByRole("button", { name: /play experience — choose your ai agent/i }));
    fireEvent.click(screen.getByRole("button", { name: /select senior-qa/i }));
    fireEvent.click(screen.getByRole("button", { name: /^next step$/i }));

    fireEvent.click(screen.getByRole("button", { name: /choose your ai agent — completed/i }));
    expect(screen.getByRole("heading", { level: 3, name: /meet the real agents behind this repo/i })).toBeInTheDocument();
  });

  it("reaches System ready after Review & Ship, and restart returns to a clean entry chapter", () => {
    render(<AiPlayground />);
    fireEvent.click(screen.getByRole("button", { name: /play experience — choose your ai agent/i }));
    fireEvent.click(screen.getByRole("button", { name: /select senior-qa/i }));
    fireEvent.click(screen.getByRole("button", { name: /^next step$/i })); // -> run-workflow
    fireEvent.click(screen.getByRole("button", { name: /start workflow/i }));
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    fireEvent.click(screen.getByRole("button", { name: /view result/i })); // -> build-test
    fireEvent.click(screen.getByRole("button", { name: /^run$/i }));
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    fireEvent.click(screen.getByRole("button", { name: /^next step$/i })); // -> review-ship
    fireEvent.click(screen.getByRole("button", { name: /^run$/i }));
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));

    expect(screen.getByText(/system ready/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /restart experience/i }));
    expect(screen.getByRole("button", { name: /play experience — choose your ai agent/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /play experience — choose your ai agent/i }));
    expect(screen.getByRole("button", { name: /choose your ai agent — current chapter/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /choose your ai agent — completed/i })).not.toBeInTheDocument();
  });
});
