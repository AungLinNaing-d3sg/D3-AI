import { fireEvent, render, screen } from "@testing-library/react";
import { AiPlayground } from "@/components/game/AiPlayground";
import { playgroundGames } from "@/data/journey";

/**
 * Chapter 07's "AI Playground" orchestrator. Verifies the 4 experiences are
 * presented as one cohesive menu, that selecting/exiting a game navigates
 * correctly, and that a completed game is reflected back on the menu — the
 * individual games' own play mechanics are covered by their own test files
 * (SignalHuntGame/NeuralPathGame/DataSortGame/TrainYourAI .test.tsx).
 */
describe("AiPlayground", () => {
  it("presents all 4 playground experiences as one menu, with no completion badges yet", () => {
    render(<AiPlayground />);
    playgroundGames.forEach((game) => {
      expect(screen.getByRole("button", { name: `Play ${game.title}` })).toBeInTheDocument();
    });
    expect(screen.queryByText(/% cleared/i)).not.toBeInTheDocument();
  });

  it("navigates into Train Your AI and back to the menu", () => {
    render(<AiPlayground />);
    fireEvent.click(screen.getByRole("button", { name: /play train your ai/i }));

    expect(screen.getByRole("heading", { level: 3, name: /train your ai/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back to the ai playground/i }));
    expect(screen.getByRole("button", { name: /play train your ai/i })).toBeInTheDocument();
  });

  it("navigates into a new 3D mini-game and skips back to the menu", () => {
    render(<AiPlayground />);
    fireEvent.click(screen.getByRole("button", { name: /play ai signal hunt/i }));
    expect(screen.getByRole("heading", { level: 3, name: /find the true signal/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));
    expect(screen.getByRole("button", { name: /play ai signal hunt/i })).toBeInTheDocument();
  });

  it("records a completed game's accuracy back on the menu card", () => {
    render(<AiPlayground />);
    fireEvent.click(screen.getByRole("button", { name: /play neural path/i }));
    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));

    fireEvent.click(screen.getByRole("button", { name: /^Ingest: DATA$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Process: PATTERN$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Reason: INFERENCE$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Decide: ACTION$/i }));

    fireEvent.click(screen.getByRole("button", { name: /back to playground/i }));

    expect(screen.getByText("100% cleared")).toBeInTheDocument();
  });
});
