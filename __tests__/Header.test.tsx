import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "@/components/layout/Header";

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("Header", () => {
  it("renders the primary navigation links", () => {
    render(<Header />);
    const nav = screen.getByRole("navigation", { name: /primary/i });
    expect(nav).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /home/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /about us/i }).length).toBeGreaterThan(0);
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
