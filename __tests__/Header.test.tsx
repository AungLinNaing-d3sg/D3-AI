import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "@/components/layout/Header";

describe("Header", () => {
  it("renders the primary in-page navigation links", () => {
    render(<Header />);
    const nav = screen.getByRole("navigation", { name: /primary/i });
    expect(nav).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /our approach/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /how we think/i }).length).toBeGreaterThan(0);
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
    expect(contactLinks.some((link) => link.getAttribute("href") === "#cta")).toBe(true);
  });

  it("toggles the mobile menu open state when the menu button is pressed", async () => {
    const user = userEvent.setup();
    render(<Header />);

    const toggle = screen.getByRole("button", { name: /open menu/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});
