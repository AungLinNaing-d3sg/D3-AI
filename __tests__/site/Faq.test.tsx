import { render, screen } from "@testing-library/react";
import { Faq } from "@/components/site/Faq";
import { faqItems } from "@/data/home";
import { siteConfig } from "@/data/site";

describe("Faq", () => {
  it("renders every question as a native disclosure with its answer", () => {
    render(<Faq />);
    faqItems.forEach((item) => {
      const summary = screen.getByText(item.q);
      expect(summary.closest("details")).toBeInTheDocument();
      expect(screen.getByText(item.a)).toBeInTheDocument();
    });
  });

  it("answers the location question with the real address", () => {
    render(<Faq />);
    expect(screen.getByText(new RegExp(siteConfig.addressLines[1]))).toBeInTheDocument();
  });

  it("offers a way to ask the assistant", () => {
    render(<Faq />);
    expect(screen.getByRole("button", { name: /ask the assistant/i })).toBeInTheDocument();
  });
});
