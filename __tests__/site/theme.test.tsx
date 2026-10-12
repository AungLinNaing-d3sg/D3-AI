import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { resolveTheme, setTheme, THEME_INIT_SCRIPT, THEME_STORAGE_KEY } from "@/lib/theme/theme";

describe("resolveTheme", () => {
  it("prefers an explicit stored choice", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("falls back to the OS preference for missing or invalid values", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme("purple", false)).toBe("light");
  });
});

describe("theme init script", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("applies the stored theme before the app loads", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    new Function(THEME_INIT_SCRIPT)();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("follows the OS when nothing is stored", () => {
    new Function(THEME_INIT_SCRIPT)();
    // jest.setup's matchMedia stub reports no match, i.e. a light OS theme.
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });
});

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => setTheme("light"));
  });

  it("switches theme, remembers the choice and reports its state", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const toggle = screen.getByRole("button", { name: /switch to dark theme/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(await screen.findByRole("button", { name: /switch to light theme/i })).toHaveAttribute("aria-pressed", "true");
  });
});
