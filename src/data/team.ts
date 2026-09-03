import type { TeamMember } from "@/types";

/**
 * Sourced from the existing "About Us" page copy (see /docs/AboutUs.png).
 * The 8-chapter scrollytelling homepage (src/app/page.tsx) doesn't include a
 * dedicated team chapter — CEO contact details still surface via
 * `siteConfig.contactPerson` in the Footer — so this is currently unused by
 * any component. Kept as real, sourced content data (not deleted) so it's
 * ready to back a future dedicated "About"/"Team" page without re-sourcing.
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
