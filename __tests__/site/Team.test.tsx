import { render, screen, within } from "@testing-library/react";
import { Team } from "@/components/site/Team";
import { leaderHighlights } from "@/data/home";
import { teamMembers } from "@/data/team";

describe("Team dossier", () => {
  it("gives every leader a named card with portrait, role and full bio", () => {
    render(<Team />);
    teamMembers.forEach((member) => {
      const card = screen.getByRole("article", { name: member.name });
      expect(within(card).getByAltText(`Portrait of ${member.name}`)).toBeInTheDocument();
      expect(within(card).getByText(member.role)).toBeInTheDocument();
      member.bio.forEach((line) => expect(within(card).getByText(line)).toBeInTheDocument());
    });
  });

  it("only shows highlights that restate the leader's own bio", () => {
    teamMembers.forEach((member) => {
      const facts = leaderHighlights[member.name];
      expect(facts).toBeDefined();
      const bio = member.bio.join(" ");
      expect(bio).toContain(`${facts!.stat} years`);
      facts!.credentials.forEach((c) => expect(bio).toContain(c));
    });
  });

  it("offers an index button per leader for jumping between cards", () => {
    render(<Team />);
    const nav = screen.getByRole("navigation", { name: "Leaders" });
    expect(within(nav).getAllByRole("button")).toHaveLength(teamMembers.length);
  });
});
