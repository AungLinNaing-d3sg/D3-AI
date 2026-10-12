import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ServiceList } from "@/components/site/ServiceList";

const items = ["One", "Two", "Three", "Four", "Five", "Six"];

describe("ServiceList", () => {
  it("keeps every item in the DOM and marks the list collapsed", () => {
    render(<ServiceList items={items} label="Demo services" />);
    const list = screen.getByRole("list", { name: "Demo services" });
    expect(list.querySelectorAll("li")).toHaveLength(items.length);
    expect(list).toHaveAttribute("data-collapsed");
  });

  it("expands and collapses with an accessible toggle", async () => {
    const user = userEvent.setup();
    render(<ServiceList items={items} label="Demo services" />);
    const toggle = screen.getByRole("button", { name: "Show all 6" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(screen.getByRole("list", { name: "Demo services" })).not.toHaveAttribute("data-collapsed");
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
  });

  it("renders no toggle for short lists", () => {
    render(<ServiceList items={items.slice(0, 4)} label="Short" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
