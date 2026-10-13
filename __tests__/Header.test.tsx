import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "@/components/layout/Header";

describe("Header", () => {
  it("renders the primary in-page navigation links", () => {
    render(<Header />);
    const nav = screen.getByRole("navigation", { name: /primary/i });
    expect(nav).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /our approach/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /how we build/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /^faq$/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /^contact$/i })).not.toBeInTheDocument();
  });

  it("links the About Us nav item to the about-us chapter anchor", () => {
    render(<Header />);
    const aboutLinks = screen.getAllByRole("link", { name: /about us/i });
    expect(aboutLinks.length).toBeGreaterThan(0);
    expect(aboutLinks.every((link) => link.getAttribute("href") === "#about")).toBe(true);
  });

  it("links the primary Contact Us action to the final CTA chapter anchor", () => {
    render(<Header />);
    const contactLinks = screen.getAllByRole("link", { name: /contact us/i });
    expect(contactLinks.some((link) => link.getAttribute("href") === "#contact")).toBe(true);
  });

  it("toggles the mobile menu open state when the menu button is pressed", async () => {
    const user = userEvent.setup();
    render(<Header />);

    const toggle = screen.getByRole("button", { name: /open menu/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps the closed mobile panel out of the tab order, and Escape closes it back to the toggle", async () => {
    const user = userEvent.setup();
    render(<Header />);
    const panel = document.getElementById("mobile-nav")!;
    expect(panel).toHaveAttribute("inert");

    const toggle = screen.getByRole("button", { name: /open menu/i });
    await user.click(toggle);
    expect(panel).not.toHaveAttribute("inert");
    expect(panel).toHaveAttribute("data-open", "true");

    await user.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(panel).toHaveAttribute("inert");
    expect(toggle).toHaveFocus();
  });

  it("keeps every mobile link pointing at the same chapter anchors as the desktop nav", () => {
    render(<Header />);
    const desktop = screen.getByRole("navigation", { name: /primary/i });
    const mobile = document.querySelector('nav[aria-label="Mobile"]')!;
    const hrefs = (root: Element) => [...root.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs(mobile).slice(0, hrefs(desktop).length)).toEqual(hrefs(desktop));
  });

  it("highlights the menu item for the section the scroll journey is in", async () => {
    const { journeyState } = await import("@/lib/motion/journeyState");
    render(<Header />);
    journeyState.activeStage = "typography"; // internal key for "Our Approach"
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    const nav = screen.getAllByRole("navigation")[0]!;
    const approach = within(nav).getByRole("link", { name: /our approach/i });
    expect(approach).toHaveAttribute("href", "#approach");
    expect(approach).toHaveAttribute("data-active", "true");
    expect(within(nav).getByRole("link", { name: /about us/i })).toHaveAttribute("data-active", "false");
    journeyState.activeStage = "intro";
  });
});
