import { fireEvent, render, screen } from "@testing-library/react";
import { WorkflowRunExperience } from "@/components/game/WorkflowRunExperience";
import { WORKFLOW_STAGES } from "@/data/journey";

/**
 * Experience 2/4 — "Run the AI Workflow". Exercises the ready → running →
 * complete phase machine through its own accessible controls; "Skip"
 * (`completeInstantly`) is used instead of waiting out the real
 * `setInterval` reveal so this stays a fast, deterministic unit test rather
 * than a timer-driven one.
 */
describe("WorkflowRunExperience", () => {
  it("starts in the ready phase with no dead-end: Start Workflow and Back are both available", () => {
    render(<WorkflowRunExperience onAdvance={jest.fn()} onExit={jest.fn()} />);
    expect(screen.getByRole("button", { name: /start workflow/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to ai playground/i })).toBeInTheDocument();
    expect(screen.getByText(/press.*start workflow.*to run scripts\/ai_workflow\.sh/i)).toBeInTheDocument();
  });

  it("moves to the running phase on Start, offering Skip and Back so the user is never stuck waiting", () => {
    render(<WorkflowRunExperience onAdvance={jest.fn()} onExit={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /start workflow/i }));

    expect(screen.getByRole("button", { name: /^skip$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to ai playground/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /start workflow/i })).not.toBeInTheDocument();
  });

  it("Skip completes every real workflow stage instantly and offers View Result / Run Again / Back", () => {
    const onAdvance = jest.fn();
    render(<WorkflowRunExperience onAdvance={onAdvance} onExit={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /start workflow/i }));
    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));

    // All 9 real stage log lines rendered, each stage marked done.
    WORKFLOW_STAGES.forEach((stage) => {
      expect(screen.getAllByText(stage.label).length).toBeGreaterThan(0);
    });
    expect(screen.getByRole("log", { name: /workflow terminal output/i })).toBeInTheDocument();

    const viewResult = screen.getByRole("button", { name: /view result/i });
    expect(screen.getByRole("button", { name: /run again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to ai playground/i })).toBeInTheDocument();

    fireEvent.click(viewResult);
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("Run Again resets back to the ready phase after completion", () => {
    render(<WorkflowRunExperience onAdvance={jest.fn()} onExit={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /start workflow/i }));
    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));
    fireEvent.click(screen.getByRole("button", { name: /run again/i }));

    expect(screen.getByRole("button", { name: /start workflow/i })).toBeInTheDocument();
  });
});
