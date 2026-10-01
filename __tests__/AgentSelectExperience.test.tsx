import { fireEvent, render, screen } from "@testing-library/react";
import { AgentSelectExperience } from "@/components/game/AgentSelectExperience";
import { AGENTS } from "@/data/journey";

/**
 * Experience 1/4 — "Choose Your AI Agent". Exercises the accessible
 * interaction (button grid + aria-live status) directly, since the
 * `@react-three/fiber` canvas is decorative/`aria-hidden` and stubbed out in
 * tests (see jest.config.ts moduleNameMapper) — same convention as
 * AiPlayground.test.tsx.
 */
describe("AgentSelectExperience", () => {
  it("renders one accessible, keyboard-operable button per real agent, with no dead-end before a selection is made", () => {
    render(<AgentSelectExperience onAdvance={jest.fn()} onExit={jest.fn()} />);

    AGENTS.forEach((agent) => {
      expect(screen.getByRole("button", { name: `Select ${agent.name} — ${agent.role}` })).toBeInTheDocument();
    });

    // Before any selection, "Next Step" isn't offered yet, but the user is
    // never trapped: "Back to AI Playground" is always available.
    expect(screen.queryByRole("button", { name: /^next step$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to ai playground/i })).toBeInTheDocument();
  });

  it("selecting an agent reveals its real responsibility, tools, and workflow stages, and marks the node pressed", () => {
    render(<AgentSelectExperience onAdvance={jest.fn()} onExit={jest.fn()} />);
    const qaAgent = AGENTS.find((agent) => agent.id === "senior-qa")!;
    const button = screen.getByRole("button", { name: `Select ${qaAgent.name} — ${qaAgent.role}` });

    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText(qaAgent.description).length).toBeGreaterThan(0);
    qaAgent.tools.forEach((tool) => {
      expect(screen.getByText(tool)).toBeInTheDocument();
    });
    expect(
      screen.getByText((_, element) => element?.tagName.toLowerCase() === "p" && /runs the.*QA.*stage.*of/i.test(element.textContent ?? ""))
    ).toBeInTheDocument();
  });

  it("offers Next Step, Run Again, and Back once an agent is selected, and each calls its handler", () => {
    const onAdvance = jest.fn();
    const onExit = jest.fn();
    render(<AgentSelectExperience onAdvance={onAdvance} onExit={onExit} />);

    fireEvent.click(screen.getByRole("button", { name: /select senior-frontend-dev/i }));
    expect(screen.getByRole("button", { name: /^next step$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^next step$/i }));
    expect(onAdvance).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /run again/i }));
    // Selection is cleared — the detail panel is gone and Next Step is no
    // longer offered until another agent is picked.
    expect(screen.queryByRole("button", { name: /^next step$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back to ai playground/i }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
