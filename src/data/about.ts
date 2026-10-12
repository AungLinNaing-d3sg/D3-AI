import { aboutPartnerNote } from "@/data/journey";

/**
 * About Us copy, in the same lean presentation as the light redesign
 * (development_v2): one headline, one statement, and short value rows.
 * Each value restates a fact from site.ts / services.ts / team.ts.
 */
export const aboutContent = {
  title: "Real-world experience.",
  titleHighlight: "Future-ready thinking.",
  statement:
    "We are a Singapore-based IT solutions provider. We turn data into decisions, processes into automation and ideas into cloud-native products, built on Microsoft and delivered by a team with real-world project experience and industrial know-how.",
  values: [
    { title: "Microsoft-focused", text: "Our service portfolio revolves around Azure, Dynamics 365 and Power Platform." },
    { title: "Certified leadership", text: "ITIL, PMP, Six Sigma Black Belt and Certified Scrum Master credentials." },
    { title: "Sector experience", text: "Trusted advisor to IT leaders across public sector, education, logistics and transportation." },
    { title: "Partner ecosystem", text: aboutPartnerNote },
  ],
} as const;

/**
 * At-a-glance facts for the leader dossier cards, keyed by name. Each value
 * restates that leader's bio in src/data/team.ts (nothing new).
 */
export const leaderHighlights: Record<string, { stat: number; statLabel: string; credentials: string[] }> = {
  "Maximillium Yip": { stat: 20, statLabel: "years in the industry", credentials: ["ITIL", "PMP", "Six Sigma Black Belt"] },
  "Leo Kyaw": { stat: 16, statLabel: "years in IT", credentials: ["Certified Scrum Master", "ITIL", "PMP", "EMBA"] },
};
