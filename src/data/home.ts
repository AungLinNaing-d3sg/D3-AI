import type { NavItem } from "@/types";
import { siteConfig } from "@/data/site";

/**
 * Copy for the homepage (src/app/page.tsx). Deliberately lean: section
 * headings and the content itself, no eyebrow/kicker labels.
 *
 * Every factual claim is carried over from the existing D3-SG site (see
 * /docs screenshots, src/data/site.ts, services.ts and team.ts). The animated
 * product demos use sample data and Microsoft's own fictional demo companies
 * (Contoso, Fabrikam, Northwind, …) so nothing reads as a real client result.
 */

/** Section links shown as individual glass pills; each `href` must match a
 * section `id` in page.tsx. Contact is rendered separately as the CTA pill. */
export const siteNav: NavItem[] = [
  { href: "#about", label: "About" },
  { href: "#services", label: "Services" },
  { href: "#process", label: "Process" },
  { href: "#team", label: "Team" },
  { href: "#faq", label: "FAQ" },
];

export const contactNav: NavItem = { href: "#contact", label: "Contact" };

export const SECTION_IDS = ["hero", "about", "services", "process", "team", "faq", "contact"] as const;

export const heroContent = {
  titleBefore: "Creating an",
  titleHighlight: "AI-infused",
  titleAfter: "future, together with you.",
  subtitle: "Data, Dynamics 365 and digital products, built on Microsoft.",
} as const;

/** Sectors and certifications from the leadership bios (src/data/team.ts). */
export const marqueeItems = [
  "Public Sector",
  "ITIL",
  "Education",
  "PMP",
  "Logistics",
  "Six Sigma Black Belt",
  "Transportation",
  "Certified Scrum Master",
] as const;

/** Short panel headings for the three disciplines; summaries and bullets come
 * from src/data/services.ts (matched by slug). */
export const serviceTiles = [
  { slug: "data", title: "Data, analytics & AI" },
  { slug: "dynamics", title: "Dynamics 365 & Power Platform" },
  { slug: "digital", title: "Cloud-native digital development" },
] as const;

export const aboutContent = {
  title: "Real-world experience.",
  titleHighlight: "Future-ready thinking.",
  statement:
    "We are a Singapore-based IT solutions provider. We turn data into decisions, processes into automation and ideas into cloud-native products, built on Microsoft and delivered by a team with real-world project experience and industrial know-how.",
  // Each point restates a fact from site.ts / services.ts / team.ts.
  values: [
    { title: "Microsoft-focused", text: "Our service portfolio revolves around Azure, Dynamics 365 and Power Platform." },
    { title: "Certified leadership", text: "ITIL, PMP, Six Sigma Black Belt and Certified Scrum Master credentials." },
    { title: "Sector experience", text: "Trusted advisor to IT leaders across public sector, education, logistics and transportation." },
  ],
} as const;

/** The scripted conversation the About-section phone plays. */
export const phoneChatScript = [
  { who: "user", text: "Hi! Where’s my order #4821?", chip: 0 },
  { who: "bot", text: "Found it 👋 Order #4821 shipped this morning and should arrive on Thursday." },
  { who: "user", text: "Great, can you send me delivery updates?" },
  { who: "bot", text: "Done! You’ll get an SMS at every step.", card: "Case updated in Dynamics 365", chip: 1 },
] as const;

export const processSteps = [
  {
    title: "Assess",
    text: "Readiness assessment and fit-gap analysis, so we know exactly where you are and what is worth changing.",
  },
  {
    title: "Plan",
    text: "Strategy road-mapping and planning, with a data architecture and governance model your organisation can trust.",
  },
  {
    title: "Build",
    text: "End-to-end implementation, integration, upgrades and migration, backed by test automation and DevOps.",
  },
  {
    title: "Run",
    text: "Post-implementation support and managed services that keep your platforms healthy as you grow.",
  },
] as const;

export const faqItems = [
  {
    q: "What does D3-SG do?",
    a: "We work across three solution areas: Data (analytics, machine learning and AI), Microsoft Dynamics 365 & Power Platform, and Digital development of cloud-native web and mobile applications.",
  },
  {
    q: "Do you only work with Microsoft technologies?",
    a: "Our service portfolio revolves around Microsoft technologies such as Azure, Dynamics 365 and Power Platform. Our Digital practice also builds cloud-native web and mobile apps.",
  },
  {
    q: "We already use Dynamics 365. Can you still help?",
    a: "Yes. We handle integration, upgrades and migration, plus post-implementation support and managed services for existing platforms.",
  },
  {
    q: "How does a project usually start?",
    a: "Usually with a readiness assessment and fit-gap analysis, followed by a strategy roadmap and plan, before any build work begins.",
  },
  {
    q: "Which industries do you work with?",
    a: "Our leadership has advised IT leaders and CIOs across the public sector, education, logistics and transportation, including enterprise-wide projects for government agencies.",
  },
  {
    q: "Where are you based?",
    a: `At ${siteConfig.addressLines.join(", ")}.`,
  },
] as const;

export const careersContent = {
  title: "Join the team",
  text: "We’re always keen to meet people who love data, Dynamics and building great software.",
  href: `mailto:${siteConfig.email}?subject=${encodeURIComponent("Careers at D3-SG")}`,
  cta: "Get in touch",
} as const;
