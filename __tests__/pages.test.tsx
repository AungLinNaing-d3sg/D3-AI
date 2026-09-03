import { render, screen } from "@testing-library/react";
import AboutPage from "@/app/about/page";
import ServicesPage from "@/app/services/page";
import ContactPage from "@/app/contact/page";
import NotFound from "@/app/not-found";

describe("AboutPage", () => {
  it("renders the page heading, team section, and closing CTA", () => {
    render(<AboutPage />);

    expect(screen.getByRole("heading", { level: 1, name: /who we are/i })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /real-world experience/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /let's work together/i })).toBeInTheDocument();
  });
});

describe("ServicesPage", () => {
  it("renders the page heading and the full services list", () => {
    render(<ServicesPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: /revolving around microsoft technologies/i })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("list").length).toBeGreaterThan(0);
  });
});

describe("ContactPage", () => {
  it("renders the contact form and contact info side by side", () => {
    render(<ContactPage />);

    expect(screen.getByRole("heading", { level: 1, name: /let's start a conversation/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
    expect(screen.getByText(/send us a message/i)).toBeInTheDocument();
  });
});

describe("NotFound", () => {
  it("renders a 404 message with a link back home", () => {
    render(<NotFound />);

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/");
  });
});
