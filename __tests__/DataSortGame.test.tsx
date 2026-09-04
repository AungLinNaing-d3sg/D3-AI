import { fireEvent, render, screen } from "@testing-library/react";
import { DataSortGame } from "@/components/game/DataSortGame";

/**
 * Mini-game 4/4 of the AI Playground (chapter 07). The 3D data field
 * (`DataSortScene`) is decorative/`aria-hidden` and stubbed out entirely by
 * the `@react-three/fiber` test mock (see jest.config.ts); these tests only
 * exercise the real, accessible select-then-classify interaction.
 */
function classify(label: RegExp, zone: RegExp) {
  fireEvent.click(screen.getByRole("button", { name: label }));
  fireEvent.click(screen.getByRole("button", { name: zone }));
}

describe("DataSortGame", () => {
  it("shows an explicit Play/Skip choice before starting, and never auto-starts", () => {
    render(<DataSortGame onFinish={jest.fn()} onExit={jest.fn()} />);
    expect(screen.getByRole("heading", { level: 3, name: /classify the data universe/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^play$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^skip$/i })).toBeInTheDocument();
  });

  it("lets the player skip without ever starting the sort", () => {
    const onExit = jest.fn();
    render(<DataSortGame onFinish={jest.fn()} onExit={onExit} />);
    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("disables both zone buttons until an object is selected", () => {
    render(<DataSortGame onFinish={jest.fn()} onExit={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));

    expect(screen.getByRole("button", { name: /^process$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^discard$/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /data object data-a/i }));
    expect(screen.getByRole("button", { name: /^process$/i })).toBeEnabled();
  });

  it("classifies every object correctly with 0 retries for a perfect score", () => {
    const onFinish = jest.fn();
    render(<DataSortGame onFinish={onFinish} onExit={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));

    classify(/data object data-a/i, /^process$/i);
    classify(/data object knowledge-a/i, /^process$/i);
    classify(/data object signal-a/i, /^process$/i);
    classify(/data object noise-a/i, /^discard$/i);
    classify(/data object data-b/i, /^process$/i);
    classify(/data object error-a/i, /^discard$/i);
    classify(/data object knowledge-b/i, /^process$/i);
    classify(/data object noise-b/i, /^discard$/i);

    expect(screen.getByText(/100% accuracy/i)).toBeInTheDocument();
    expect(screen.getByText("Pipeline optimised")).toBeInTheDocument();
    expect(onFinish).toHaveBeenCalledWith(100);
  });

  it("keeps a wrongly classified object in play for another attempt instead of trapping the player", () => {
    render(<DataSortGame onFinish={jest.fn()} onExit={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));

    // NOISE-A belongs in Discard — sending it to Process should fail...
    classify(/data object noise-a/i, /^process$/i);
    expect(screen.getByRole("button", { name: /data object noise-a/i })).toBeEnabled();

    // ...and the player can immediately retry with the correct zone.
    classify(/data object noise-a/i, /^discard$/i);
    expect(screen.getByRole("button", { name: /data object noise-a/i })).toBeDisabled();
  });
});
