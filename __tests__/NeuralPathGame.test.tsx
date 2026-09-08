import { fireEvent, render, screen } from "@testing-library/react";
import { NeuralPathGame } from "@/components/game/NeuralPathGame";

/**
 * Mini-game 3/4 of the AI Playground (chapter 07). The 3D maze
 * (`NeuralPathScene`) is decorative/`aria-hidden` and stubbed out entirely
 * by the `@react-three/fiber` test mock (see jest.config.ts); these tests
 * only exercise the real, accessible button-driven interaction and scoring.
 */
describe("NeuralPathGame", () => {
  it("shows an explicit Play/Skip choice before starting, and never auto-starts", () => {
    render(<NeuralPathGame onFinish={jest.fn()} onExit={jest.fn()} />);
    expect(screen.getByRole("heading", { level: 3, name: /route the network/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^play$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^skip$/i })).toBeInTheDocument();
  });

  it("lets the player skip without ever starting the maze", () => {
    const onExit = jest.fn();
    render(<NeuralPathGame onFinish={jest.fn()} onExit={onExit} />);
    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("builds a perfect path with 0 wrong turns and reports 100% accuracy", () => {
    const onFinish = jest.fn();
    render(<NeuralPathGame onFinish={onFinish} onExit={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));

    fireEvent.click(screen.getByRole("button", { name: /^Ingest: DATA$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Process: PATTERN$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Reason: INFERENCE$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Decide: ACTION$/i }));

    expect(screen.getByText(/100% path accuracy/i)).toBeInTheDocument();
    expect(screen.getByText("Optimal pathway")).toBeInTheDocument();
    expect(onFinish).toHaveBeenCalledWith(100);
  });

  it("penalises wrong turns but always lets the player recover and finish", () => {
    const onFinish = jest.fn();
    render(<NeuralPathGame onFinish={onFinish} onExit={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));

    // Wrong turn at the first junction — must stay solvable, not block progress.
    fireEvent.click(screen.getByRole("button", { name: /^Ingest: SPAM$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Ingest: DATA$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Process: PATTERN$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Reason: INFERENCE$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Decide: ACTION$/i }));

    expect(screen.getByText(/88% path accuracy/i)).toBeInTheDocument();
    expect(onFinish).toHaveBeenCalledWith(88);
  });

  it("offers Replay and Back to playground once the network is activated", () => {
    render(<NeuralPathGame onFinish={jest.fn()} onExit={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Ingest: DATA$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Process: PATTERN$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Reason: INFERENCE$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Decide: ACTION$/i }));

    expect(screen.getByRole("button", { name: /^replay$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to playground/i })).toBeInTheDocument();
  });
});
