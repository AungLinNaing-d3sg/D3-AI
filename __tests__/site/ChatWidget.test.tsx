import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatOpenButton, ChatWidget } from "@/components/site/ChatWidget";
import { siteConfig } from "@/data/site";

// Reduced motion makes the assistant reply without its typing delay.
const originalMatchMedia = window.matchMedia;
beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    ...originalMatchMedia(query),
    matches: query.includes("prefers-reduced-motion"),
  })) as typeof window.matchMedia;
});
afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe("ChatWidget", () => {
  it("opens from the launcher and greets the visitor", async () => {
    const user = userEvent.setup();
    render(<ChatWidget />);
    const launcher = screen.getByRole("button", { name: /open chat/i });
    expect(launcher).toHaveAttribute("aria-expanded", "false");

    await user.click(launcher);

    expect(launcher).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByText(/demo assistant/i, { selector: "span" })).toBeInTheDocument();
  });

  it("answers a quick reply with real company details", async () => {
    const user = userEvent.setup();
    render(<ChatWidget />);
    await user.click(screen.getByRole("button", { name: /open chat/i }));
    await user.click(screen.getByRole("button", { name: "Where are you?" }));

    expect(await screen.findByText(new RegExp(siteConfig.addressLines[0].replace(/[#]/g, "\\$&")))).toBeInTheDocument();
  });

  it("answers a typed question and clears the input", async () => {
    const user = userEvent.setup();
    render(<ChatWidget />);
    await user.click(screen.getByRole("button", { name: /open chat/i }));
    const input = screen.getByLabelText("Message");
    await user.type(input, "Do you build mobile apps?{Enter}");

    expect(input).toHaveValue("");
    expect(await screen.findByText(/cloud-native web and mobile apps/i)).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<ChatWidget />);
    await user.click(screen.getByRole("button", { name: /open chat/i }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: /open chat/i })).toHaveAttribute("aria-expanded", "false");
  });

  it("can be opened from elsewhere on the page", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ChatOpenButton>Ask the assistant</ChatOpenButton>
        <ChatWidget />
      </>
    );
    await user.click(screen.getByRole("button", { name: /ask the assistant/i }));
    await act(async () => undefined);
    expect(screen.getByRole("button", { name: /close chat/i, expanded: true })).toBeInTheDocument();
  });
});
