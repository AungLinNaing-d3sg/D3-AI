import type { TeamMember } from "@/types";

/**
 * Sourced from the existing "About Us" page copy (see /docs/AboutUs.png).
 * Rendered by chapter 02 — About Us / Who we are (see
 * components/sections/AboutSection.tsx for the accessible team roster and
 * components/three/scenes/AboutScene.tsx for the orbiting 3D identity
 * nodes derived from it via src/data/journey.ts's `aboutTeamNodes`).
 * `siteConfig.contactPerson` in the Footer still separately surfaces the
 * CEO's direct contact details.
 */
export const teamMembers: TeamMember[] = [
  {
    name: "Maximillium Yip",
    role: "Chief Executive Officer",
    initials: "MY",
    bio: [
      "More than 20 years in the industry as a sales leader",
      "Certifications in ITIL, PMP and Six Sigma Black Belt",
      "Trusted advisor to IT leaders and CIOs across Public Sector, Education, Logistics and Transportation",
    ],
  },
  {
    name: "Leo Kyaw",
    role: "Chief Operating Officer",
    initials: "LK",
    bio: [
      "More than 16 years in IT as BU Head, Project Director, and Technical Specialist",
      "Double degree in Physics & Business Information Systems; EMBA from Quantic School of Business and Technology",
      "Certified Scrum Master, ITIL, PMP",
      "Managed and delivered enterprise-wide projects for customers including government agencies",
    ],
  },
];
