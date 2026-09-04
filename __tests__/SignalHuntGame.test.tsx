import { fireEvent, render, screen } from "@testing-library/react";
import { SignalHuntGame } from "@/components/game/SignalHuntGame";

/**
 * Mini-game 2/4 of the AI Playground (chapter 07). The 3D signal field
 * (`SignalHuntScene`) is decorative/`aria-hidden` and stubbed out entirely
 * by the `@react-three/fiber` test mock (see jest.config.ts); these tests
 * only exercise the real, accessible tag-the-signal interaction and scoring.
 */
describe("SignalHuntGame", () => {
  it("shows an explicit Play/Skip choice before starting, and never auto-starts", () => {
    render(<SignalHuntGame onFinish={jest.fn()} onExit={jest.fn()} />);
    expect(screen.getByRole("heading", { level: 3, name: /find the true signal/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^play$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^skip$/i })).toBeInTheDocument();
  });

  it("lets the player skip without ever starting the hunt", () => {
    const onExit = jest.fn();
    render(<SignalHuntGame onFinish={jest.fn()} onExit={onExit} />);
    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("locking a genuine signal disables it and raises the score, without ending the hunt early", () => {
    render(<SignalHuntGame onFinish={jest.fn()} onExit={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));

    const signal = screen.getByRole("button", { name: /transmission ai-04/i });
    fireEvent.click(signal);

    expect(signal).toBeDisabled();
    expect(screen.getByText("Locked 1/6")).toBeInTheDocument();
    // The hunt only ends once every real signal is found, not on a single catch.
    expect(screen.queryByText(/hunt complete/i)).not.toBeInTheDocument();
  });

  it("tagging noise costs score but never blocks finishing the hunt", () => {
    render(<SignalHuntGame onFinish={jest.fn()} onExit={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));

    const noise = screen.getByRole("button", { name: /transmission err-12/i });
    fireEvent.click(noise);

    expect(noise).toBeDisabled();
    expect(screen.getByText("Locked 0/6")).toBeInTheDocument();
  });

  it("ends the hunt with a perfect score once every genuine signal is locked", () => {
    const onFinish = jest.fn();
    render(<SignalHuntGame onFinish={onFinish} onExit={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));

    ["AI-04", "AI-11", "AI-19", "AI-27", "AI-33", "AI-40"].forEach((label) => {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`transmission ${label}`, "i") }));
    });

    expect(screen.getByText(/96% accuracy/i)).toBeInTheDocument();
    expect(screen.getByText("Signal locked")).toBeInTheDocument();
    expect(onFinish).toHaveBeenCalledWith(96);
  });
});
