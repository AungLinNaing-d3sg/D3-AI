import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SiteHeader } from "@/components/site/SiteHeader";
import { siteNav } from "@/data/home";

describe("SiteHeader", () => {
  it("links to every homepage section", () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    siteNav.forEach((item) => {
      expect(within(nav).getByRole("link", { name: item.label })).toHaveAttribute("href", item.href);
    });
  });

  it("opens and closes the mobile menu, keeping it inert while closed", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    const toggle = screen.getByRole("button", { name: /open menu/i });
    const menu = document.getElementById("mobile-menu")!;
    expect(menu).toHaveAttribute("inert");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(menu).not.toHaveAttribute("inert");
    expect(document.documentElement).toHaveClass("menu-open");

    await user.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.documentElement).not.toHaveClass("menu-open");
  });

  it("closes the mobile menu when a link is chosen", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    await user.click(screen.getByRole("button", { name: /open menu/i }));
    const mobileNav = screen.getByRole("navigation", { name: "Mobile" });
    await user.click(within(mobileNav).getByRole("link", { name: /faq/i }));
    expect(screen.getByRole("button", { name: /open menu/i })).toHaveAttribute("aria-expanded", "false");
  });

  it("marks About active even while the pinned hero still covers the screen", () => {
    // The hero is pinned (top 0, full height) while the curtain carries About up.
    const tops: Record<string, number> = { hero: 0, about: 300, services: 2000, process: 4000, team: 5000, faq: 6000, contact: 7000 };
    const sections = Object.entries(tops).map(([id, top]) => {
      const el = document.createElement("section");
      el.id = id;
      el.getBoundingClientRect = () => ({ top, bottom: top + 900, left: 0, right: 0, width: 0, height: 900, x: 0, y: top, toJSON: () => ({}) });
      document.body.append(el);
      return el;
    });
    Object.defineProperty(window, "innerHeight", { value: 900, configurable: true });
    render(<SiteHeader />);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    return new Promise<void>((resolve) =>
      requestAnimationFrame(() => {
        const nav = screen.getByRole("navigation", { name: "Primary" });
        expect(within(nav).getByRole("link", { name: "About" })).toHaveClass("is-active");
        sections.forEach((el) => el.remove());
        resolve();
      })
    );
  });
});
