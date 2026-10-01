import { fireEvent, render, screen } from "@testing-library/react";
import { BuildTestExperience } from "@/components/game/BuildTestExperience";

/**
 * Experience 3/4 — "Build & Test". Exercises the ready → running → complete
 * phase machine and the ANALYZING → IMPLEMENTING → TESTING → FIXING →
 * VERIFIED status sequence through the accessible panel; "Skip" is used
 * instead of waiting out the real `setInterval` reveal.
 */
describe("BuildTestExperience", () => {
  it("starts in the ready phase with Run and Back available, no dead-end", () => {
    render(<BuildTestExperience onAdvance={jest.fn()} onExit={jest.fn()} />);
    expect(screen.getByRole("button", { name: /^run$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to ai playground/i })).toBeInTheDocument();
    expect(screen.getByText(/press.*run.*to begin/i)).toBeInTheDocument();
  });

  it("moves to the running phase on Run, offering Skip and Back", () => {
    render(<BuildTestExperience onAdvance={jest.fn()} onExit={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^run$/i }));

    expect(screen.getByRole("button", { name: /^skip$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to ai playground/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^run$/i })).not.toBeInTheDocument();
  });

  it("Skip reveals every beat (assistant, code, terminal) through to VERIFIED and offers Next Step", () => {
    const onAdvance = jest.fn();
    render(<BuildTestExperience onAdvance={onAdvance} onExit={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^run$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));

    expect(screen.getByText(/all checks green/i)).toBeInTheDocument();
    expect(screen.getByText(/pass featurecard\.test\.tsx/i)).toBeInTheDocument();
    expect(screen.getByRole("log", { name: /test terminal output/i })).toBeInTheDocument();

    const nextStep = screen.getByRole("button", { name: /^next step$/i });
    expect(screen.getByRole("button", { name: /run again/i })).toBeInTheDocument();

    fireEvent.click(nextStep);
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("Run Again resets back to the ready phase after completion", () => {
    render(<BuildTestExperience onAdvance={jest.fn()} onExit={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^run$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));
    fireEvent.click(screen.getByRole("button", { name: /run again/i }));

    expect(screen.getByRole("button", { name: /^run$/i })).toBeInTheDocument();
  });
});
