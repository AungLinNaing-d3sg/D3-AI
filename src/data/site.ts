/**
 * Central source of truth for company identity/contact details.
 *
 * Sourced from the existing D3-SG marketing site (see /docs reference
 * screenshots) so copy stays accurate. Update here once and every page,
 * the footer, and structured data will stay in sync.
 */
export const siteConfig = {
  name: "D3-SG",
  legalName: "D3-SG Pte Ltd",
  uen: "202127732E",
  tagline: "Creating an AI infused future together with you.",
  description:
    "D3-SG is a Singapore-based IT solutions provider specialising in Data & AI, Microsoft Dynamics 365 & Power Platform, and Digital application development.",
  url: "https://www.d3-sg.com",
  addressLines: [
    "60 Paya Lebar Road, #07-54",
    "Paya Lebar Square, Singapore 409051",
  ],
  phone: "+65 8772 8128",
  phoneHref: "+6587728128",
  email: "max.yip@d3-sg.com",
  contactPerson: {
    name: "Max Yip",
    role: "Chief Executive Officer",
  },
} as const;
