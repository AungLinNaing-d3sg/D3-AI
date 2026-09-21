import { fireEvent, render, screen } from "@testing-library/react";
import { AiPlayground } from "@/components/game/AiPlayground";
import { playgroundExperiences } from "@/data/journey";

/**
 * Chapter 06's "AI Engineering Playground" orchestrator. Verifies the 4
 * experiences are presented as one cohesive menu, that opening/exiting an
 * experience navigates correctly, and that visiting an experience is
 * reflected back on the menu — each experience's own internal flow is
 * exercised by rendering it directly below.
 */
describe("AiPlayground", () => {
  it("presents all 4 playground experiences as one menu, with no visited badges yet", () => {
    render(<AiPlayground />);
    playgroundExperiences.forEach((experience) => {
      expect(screen.getByRole("button", { name: `Open ${experience.title}` })).toBeInTheDocument();
    });
    expect(screen.queryByText(/visited/i)).not.toBeInTheDocument();
  });

  it("navigates into Choose Your AI Agent and back to the menu", () => {
    render(<AiPlayground />);
    fireEvent.click(screen.getByRole("button", { name: /open choose your ai agent/i }));

    expect(screen.getByRole("heading", { level: 3, name: /meet the real agents behind this repo/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back to ai playground/i }));
    expect(screen.getByRole("button", { name: /open choose your ai agent/i })).toBeInTheDocument();
  });

  it("navigates into Run the AI Workflow and marks it visited back on the menu", () => {
    render(<AiPlayground />);
    fireEvent.click(screen.getByRole("button", { name: /open run the ai workflow/i }));
    expect(screen.getByRole("heading", { level: 3, name: /scripts\/ai_workflow\.sh/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back to ai playground/i }));
    expect(screen.getByRole("button", { name: /open run the ai workflow/i })).toBeInTheDocument();
    expect(screen.getAllByText("Visited")).toHaveLength(1);
  });

  it("selecting an agent reveals its real responsibility and lets the user advance to the workflow experience", () => {
    render(<AiPlayground />);
    fireEvent.click(screen.getByRole("button", { name: /open choose your ai agent/i }));
    fireEvent.click(screen.getByRole("button", { name: /select senior-qa/i }));

    expect(screen.getAllByText(/writes and maintains unit, integration, and end-to-end tests/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /^next step$/i }));
    expect(screen.getByRole("heading", { level: 3, name: /scripts\/ai_workflow\.sh/i })).toBeInTheDocument();
  });
});
