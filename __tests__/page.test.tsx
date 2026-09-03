import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders the primary hero heading", () => {
    render(<HomePage />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(/AI infused future/i);
  });

  it("renders the services section", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { name: /revolving around microsoft technologies/i })
    ).toBeInTheDocument();
  });
});
