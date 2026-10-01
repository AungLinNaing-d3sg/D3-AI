import { act, render } from "@testing-library/react";
import { CustomCursor, resolveCursorTarget } from "@/components/cursor/CustomCursor";

function mockMedia({ fine, reduced = false }: { fine: boolean; reduced?: boolean }) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: query.includes("pointer: fine") ? fine : query.includes("reduce") ? reduced : false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })) as unknown as typeof window.matchMedia;
}

function pointer(type: string, init: { clientX?: number; clientY?: number; pointerType?: string; target?: Element } = {}) {
  const event = new MouseEvent(type, { bubbles: true, clientX: init.clientX ?? 0, clientY: init.clientY ?? 0 });
  Object.defineProperty(event, "pointerType", { value: init.pointerType ?? "mouse" });
  act(() => {
    (init.target ?? document.body).dispatchEvent(event);
  });
}

describe("CustomCursor (arrow + sparks)", () => {
  beforeAll(() => {
    // jsdom has no 2D canvas; the sparks only need these calls.
    // Every property/call returns the same stub, so chained calls
    // (createRadialGradient().addColorStop()) work too.
    const ctx: object = new Proxy(function stub() {}, { get: () => ctx, apply: () => ctx, set: () => true });
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  it("renders nothing on touch / coarse-pointer devices", () => {
    mockMedia({ fine: false });
    const { container } = render(<CustomCursor />);
    expect(container.querySelector(".cursor-arrow")).toBeNull();
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("renders nothing when the user prefers reduced motion", () => {
    mockMedia({ fine: true, reduced: true });
    const { container } = render(<CustomCursor />);
    expect(container.querySelector(".cursor-arrow")).toBeNull();
  });

  it("mounts one arrow and one spark canvas, aria-hidden, even if rendered twice", () => {
    mockMedia({ fine: true });
    const { container } = render(
      <>
        <CustomCursor />
        <CustomCursor />
      </>
    );
    expect(container.querySelectorAll(".cursor-arrow")).toHaveLength(1);
    expect(container.querySelectorAll("canvas.cursor-fx")).toHaveLength(1);
    expect(container.querySelector(".cursor-arrow")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("canvas.cursor-fx")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows on mouse movement (hiding the native cursor only then), fades out on leaving, ignores touch", () => {
    mockMedia({ fine: true });
    const { container } = render(<CustomCursor />);
    const arrow = container.querySelector(".cursor-arrow")!;
    expect(arrow).toHaveAttribute("data-visible", "false");
    pointer("pointermove", { clientX: 40, clientY: 50 });
    expect(arrow).toHaveAttribute("data-visible", "true");
    expect(document.documentElement).toHaveClass("has-custom-cursor");

    act(() => {
      document.body.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: null }));
    });
    expect(arrow).toHaveAttribute("data-visible", "false");
    expect(document.documentElement).not.toHaveClass("has-custom-cursor");

    pointer("pointermove", { clientX: 5, clientY: 5, pointerType: "touch" });
    expect(arrow).toHaveAttribute("data-visible", "false");
  });

  it("warms over interactive elements, with the accent on the primary CTA; steps back over text fields", () => {
    mockMedia({ fine: true });
    const { container } = render(
      <>
        <CustomCursor />
        <a href="#about">About</a>
        <a href="#cta" data-cursor="magnetic" data-cursor-tone="accent">
          Contact
        </a>
        <input type="email" aria-label="Email" />
      </>
    );
    const arrow = container.querySelector(".cursor-arrow")!;
    const [link, cta] = container.querySelectorAll("a");
    pointer("pointerover", { target: link });
    expect(arrow).toHaveAttribute("data-mode", "hover");
    expect(arrow).toHaveAttribute("data-accent", "false");
    pointer("pointerover", { target: cta });
    expect(arrow).toHaveAttribute("data-accent", "true");
    pointer("pointerover", { target: container.querySelector("input")! });
    expect(arrow).toHaveAttribute("data-mode", "text");
  });

  it("adds no DOM for sparks, however many clicks", () => {
    mockMedia({ fine: true });
    const { container } = render(<CustomCursor />);
    const count = () => container.querySelectorAll("*").length;
    const before = count();
    for (let i = 0; i < 40; i += 1) {
      pointer("pointerdown", { clientX: i, clientY: i });
      pointer("pointerup");
    }
    expect(count()).toBe(before);
  });
});

describe("resolveCursorTarget", () => {
  it("maps elements to the cursor's reactions", () => {
    document.body.innerHTML = `
      <nav><a href="#about" data-cursor="magnetic">About</a></nav>
      <button type="button">Play</button>
      <button type="button" disabled>Off</button>
      <textarea aria-label="Message"></textarea>
      <p>text</p>`;
    const q = (sel: string) => document.querySelector(sel)!;
    expect(resolveCursorTarget(q("nav a")).mode).toBe("hover");
    expect(resolveCursorTarget(q("button")).mode).toBe("hover");
    expect(resolveCursorTarget(q("button[disabled]")).mode).toBe("default");
    expect(resolveCursorTarget(q("textarea")).mode).toBe("text");
    expect(resolveCursorTarget(q("p")).mode).toBe("default");
  });
});
