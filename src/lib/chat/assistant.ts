import { siteConfig } from "@/data/site";

/**
 * Scripted replies for the on-page chat widget (components/site/ChatWidget).
 *
 * Deliberately not an AI model or a live-chat service: answers are fixed,
 * sourced from the same site content as everything else, and the widget is
 * labelled as a demo. Nothing a visitor types ever leaves the page. Swap
 * `replyFor` for a real backend (e.g. Copilot Studio) once one exists.
 */

export type ReplyPart = string | { href: string; label: string };

export const REPLY_KEYS = [
  "hello",
  "services",
  "data",
  "dynamics",
  "digital",
  "start",
  "location",
  "contact",
  "fallback",
] as const;

export type ReplyKey = (typeof REPLY_KEYS)[number];

const mail = `mailto:${siteConfig.email}`;

export const REPLIES: Record<ReplyKey, ReplyPart[]> = {
  hello: [
    "Hi there 👋 I’m the D3-SG demo assistant. Ask me about our services, how projects start, or how to reach the team.",
  ],
  services: [
    "We work across three areas: Data & AI, Microsoft Dynamics 365 & Power Platform, and Digital (cloud-native app) development. ",
    { href: "#services", label: "See services" },
  ],
  data: [
    "Our Data practice covers data architecture & design, governance, BI & data warehousing, analytics and insights, and Data-as-a-Service using AI and ML.",
  ],
  dynamics: [
    "For Dynamics 365 & Power Platform we do readiness assessments & fit-gap analysis, roadmapping, end-to-end implementation, integration, upgrades & migration, and managed support.",
  ],
  digital: [
    "We build cloud-native web and mobile apps, modernise existing applications, and deliver CMS, DMS and business-process platforms, with test automation & DevOps.",
  ],
  start: [
    "Most projects begin with a readiness assessment. The easiest first step is a short conversation: ",
    { href: "#contact", label: "send us a message" },
    ` or call ${siteConfig.phone}.`,
  ],
  location: [`We’re at ${siteConfig.addressLines.join(", ")}.`],
  contact: [
    `You can reach ${siteConfig.contactPerson.name} (CEO) at `,
    { href: mail, label: siteConfig.email },
    " or ",
    { href: `tel:${siteConfig.phoneHref}`, label: siteConfig.phone },
    ".",
  ],
  fallback: [
    "I’m a demo with scripted answers, so I might not know that one. ",
    { href: mail, label: "Email the team" },
    " and a real person will get back to you.",
  ],
};

/** Checked in order; the first match wins, so more specific intents go first. */
const INTENTS: ReadonlyArray<readonly [ReplyKey, RegExp]> = [
  ["hello", /^(hi|hello|hey|yo|good (morning|afternoon|evening))\b/i],
  ["start", /\b(start|project|quote|price|pricing|cost|budget|hire|engage)/i],
  ["location", /\b(where|location|office|address|based|visit)/i],
  ["contact", /\b(contact|email|phone|call|human|person|talk|speak)/i],
  ["dynamics", /\b(dynamics|365|power ?(platform|apps|automate)|crm|erp)/i],
  ["digital", /\b(app|apps|web|website|mobile|digital|develop|cloud|devops|cms|dms)/i],
  ["data", /\b(data|ai|ml|machine|analytic|bi|power ?bi|warehouse|insight|governance)/i],
  ["services", /\b(service|services|offer|do you do|what do you|help)/i],
];

export function replyFor(text: string): ReplyKey {
  const trimmed = text.trim();
  return INTENTS.find(([, pattern]) => pattern.test(trimmed))?.[0] ?? "fallback";
}

export const QUICK_REPLIES: ReadonlyArray<{ label: string; key: ReplyKey }> = [
  { label: "Our services", key: "services" },
  { label: "Start a project", key: "start" },
  { label: "Where are you?", key: "location" },
  { label: "Talk to a person", key: "contact" },
];

/** Upper bound on what the widget accepts, mirrored on the input element. */
export const CHAT_INPUT_MAX_LENGTH = 300;
