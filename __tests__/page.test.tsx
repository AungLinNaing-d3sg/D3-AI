import { render, screen, within } from "@testing-library/react";
import Home from "@/app/page";
import { SECTION_IDS, siteNav } from "@/data/home";
import { services } from "@/data/services";
import { teamMembers } from "@/data/team";

// The scroll choreography and the animated backdrop are decorative and
// imperative; here we only assert the real content the page composes.
jest.mock("@/components/site/MotionDirector", () => ({ MotionDirector: () => null }));
jest.mock("@/components/site/SiteBackground", () => ({ SiteBackground: () => null }));

describe("Home page", () => {
  it("renders every section the navigation links to", () => {
    render(<Home />);
    SECTION_IDS.forEach((id) => {
      expect(document.getElementById(id)).toBeInTheDocument();
    });
    siteNav.forEach((item) => {
      expect(document.getElementById(item.href.slice(1))).toBeInTheDocument();
    });
  });

  it("has exactly one top-level heading, the hero headline", () => {
    render(<Home />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(/creating an ai-infused future, together with you/i);
  });

  it("describes all three disciplines from the shared service data", () => {
    render(<Home />);
    const section = document.getElementById("services")!;
    services.forEach((service) => {
      expect(within(section).getByText(service.summary)).toBeInTheDocument();
    });
  });

  it("introduces the real leadership team with their portraits", () => {
    render(<Home />);
    const section = document.getElementById("team")!;
    teamMembers.forEach((member) => {
      expect(within(section).getByRole("heading", { name: member.name })).toBeInTheDocument();
      expect(within(section).getByAltText(`Portrait of ${member.name}`)).toBeInTheDocument();
    });
  });

  it("keeps the decorative product demos out of the accessibility tree and labels them as sample data", () => {
    render(<Home />);
    expect(document.querySelector("#hero .stage")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText(/sample data/i)).toBeInTheDocument();
  });

  it("renders the contact form inside the contact section", () => {
    render(<Home />);
    const section = document.getElementById("contact")!;
    expect(within(section).getByRole("button", { name: /send message/i })).toBeInTheDocument();
  });
});
