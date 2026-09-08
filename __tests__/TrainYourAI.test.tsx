import { act, fireEvent, render, screen } from "@testing-library/react";
import { TrainYourAI } from "@/components/game/TrainYourAI";

function mockReducedMotion(matches: boolean) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? matches : false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe("TrainYourAI mini-game", () => {
  beforeEach(() => {
    mockReducedMotion(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders an explicit Play/Skip choice up front and never auto-starts", () => {
    render(<TrainYourAI />);

    expect(screen.getByRole("heading", { level: 3, name: /train your ai/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^play$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^skip$/i })).toBeInTheDocument();
    // The gameplay track (role="img") only appears once the user opts in.
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("warns reduced-motion users the game includes motion before they opt in", () => {
    mockReducedMotion(true);
    render(<TrainYourAI />);

    expect(screen.getByText(/this mini-game includes motion/i)).toBeInTheDocument();
  });

  it("does not show the reduced-motion warning when motion is not reduced", () => {
    render(<TrainYourAI />);
    expect(screen.queryByText(/this mini-game includes motion/i)).not.toBeInTheDocument();
  });

  it("lets the user skip without ever starting the game", () => {
    render(<TrainYourAI />);

    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));

    expect(screen.getByText(/skipped.*keep scrolling/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play instead/i })).toBeInTheDocument();
    // Skipping tears down the idle Play/Skip choice.
    expect(screen.queryByRole("button", { name: /^play$/i })).not.toBeInTheDocument();
  });

  it("starts the game on Play and exposes an accessible, screen-reader-friendly status", () => {
    render(<TrainYourAI />);

    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));

    const track = screen.getByRole("img", { name: /training in progress/i });
    expect(track).toHaveAccessibleName(/accuracy 0 percent/i);
    expect(track).toHaveAccessibleName(/20 seconds remaining/i);
    expect(screen.getByText("Accuracy 0%")).toBeInTheDocument();
    expect(screen.getByText("20s")).toBeInTheDocument();
  });

  it("exposes keyboard/click-operable agent controls once playing", () => {
    render(<TrainYourAI />);
    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));

    const leftButton = screen.getByRole("button", { name: /move ai agent left/i });
    const rightButton = screen.getByRole("button", { name: /move ai agent right/i });

    expect(leftButton).toBeEnabled();
    expect(rightButton).toBeEnabled();
    // Clicking the on-screen nudge controls must not throw.
    expect(() => fireEvent.click(leftButton)).not.toThrow();
    expect(() => fireEvent.click(rightButton)).not.toThrow();
  });

  it("lets the player skip mid-game, returning to the skipped state", () => {
    render(<TrainYourAI />);
    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));

    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));

    expect(screen.getByText(/skipped.*keep scrolling/i)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("counts down to zero, ends the round, and announces the result to assistive tech", () => {
    jest.useFakeTimers();
    render(<TrainYourAI />);

    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));

    act(() => {
      jest.advanceTimersByTime(20_000);
    });

    expect(screen.getByText(/ai trained/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /% accuracy/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /train again/i })).toBeInTheDocument();
    // The finished result is also announced via the live region for
    // non-visual users, not just shown visually.
    expect(screen.getByText(/training complete\. accuracy \d+ percent/i)).toBeInTheDocument();
  });

  it("allows starting a new round after finishing", () => {
    jest.useFakeTimers();
    render(<TrainYourAI />);

    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));
    act(() => {
      jest.advanceTimersByTime(20_000);
    });

    fireEvent.click(screen.getByRole("button", { name: /train again/i }));

    const track = screen.getByRole("img", { name: /training in progress/i });
    expect(track).toHaveAccessibleName(/accuracy 0 percent/i);
    expect(screen.getByText("20s")).toBeInTheDocument();
  });
});
