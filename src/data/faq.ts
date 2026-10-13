import { siteConfig } from "@/data/site";

/**
 * FAQ chapter copy (ported from the light redesign, development_v2). Each
 * answer restates a fact from site.ts / services.ts / team.ts.
 */
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
