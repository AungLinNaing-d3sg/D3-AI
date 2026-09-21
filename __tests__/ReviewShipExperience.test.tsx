import { fireEvent, render, screen } from "@testing-library/react";
import { ReviewShipExperience } from "@/components/game/ReviewShipExperience";

/**
 * Experience 4/4 — "Review & Ship". The final experience in the chain: it
 * has no `onAdvance` (there is no experience 5), so its only forward path
 * once complete is Run Again / Back to AI Playground — verified explicitly
 * below so this doesn't silently become a dead end.
 */
describe("ReviewShipExperience", () => {
  it("starts in the ready phase with Run and Back available", () => {
    render(<ReviewShipExperience onExit={jest.fn()} />);
    expect(screen.getByRole("button", { name: /^run$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to ai playground/i })).toBeInTheDocument();
  });

  it("moves to the running phase on Run, offering Skip and Back", () => {
    render(<ReviewShipExperience onExit={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^run$/i }));

    expect(screen.getByRole("button", { name: /^skip$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to ai playground/i })).toBeInTheDocument();
  });

  it("Skip confirms every checklist item (Implemented, Tested, Reviewed, Ready to ship) and never dead-ends", () => {
    const onExit = jest.fn();
    render(<ReviewShipExperience onExit={onExit} />);
    fireEvent.click(screen.getByRole("button", { name: /^run$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));

    ["Implemented", "Tested", "Reviewed", "Ready to ship"].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
    expect(screen.getByText(/implemented, tested, reviewed, ready to ship/i)).toBeInTheDocument();

    // No "Next Step"/"View Result" here — this is the last experience in
    // the chain — but Run Again and Back remain, so the user is never
    // trapped on the final screen.
    expect(screen.queryByRole("button", { name: /^next step$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run again/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back to ai playground/i }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("Run Again resets back to the ready phase after completion", () => {
    render(<ReviewShipExperience onExit={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^run$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));
    fireEvent.click(screen.getByRole("button", { name: /run again/i }));

    expect(screen.getByRole("button", { name: /^run$/i })).toBeInTheDocument();
  });
});
