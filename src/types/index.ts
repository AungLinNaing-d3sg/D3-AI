import type { Route } from "next";

/** A single primary navigation entry rendered in the header/footer. */
export interface NavItem {
  href: Route;
  label: string;
}

/** Icon identifiers rendered by <ServiceIcon />. Keeping this a union (rather
 * than `string`) means adding a new service can't silently reference a
 * missing icon. */
export type ServiceIconName = "data" | "dynamics" | "digital";

export interface Service {
  slug: string;
  icon: ServiceIconName;
  title: string;
  summary: string;
  bullets: string[];
}

export interface TeamMember {
  name: string;
  role: string;
  initials: string;
  bio: string[];
}

export interface BrandPillar {
  label: string;
  value: string;
  description: string;
}

/** Shape of the contact form's controlled input state. */
export interface ContactFormValues {
  name: string;
  email: string;
  company: string;
  message: string;
  /** Honeypot field — must stay empty. Real users never see or fill it in. */
  website: string;
}

export type ContactFormErrors = Partial<Record<keyof ContactFormValues, string>>;

export type ContactFormStatus = "idle" | "submitting" | "success" | "error";
