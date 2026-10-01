"use server";

import {
  CONTACT_FIELD_NAMES,
  CONTACT_HONEYPOT_FIELD,
  emptyContactFormValues,
  validateContactForm,
  type ContactFormErrors,
  type ContactFormValues,
} from "@/lib/validation/contactForm";

export interface ContactFormState {
  status: "idle" | "success" | "error";
  message: string;
  errors: ContactFormErrors;
  /** Bumped on every submission so the client can always detect a fresh
   * result, even if two submissions happen to produce identical state. */
  submittedAt: number;
}

export const initialContactFormState: ContactFormState = {
  status: "idle",
  message: "",
  errors: {},
  submittedAt: 0,
};

function readValues(formData: FormData): ContactFormValues {
  const values = emptyContactFormValues();
  for (const field of CONTACT_FIELD_NAMES) {
    const raw = formData.get(field);
    values[field] = typeof raw === "string" ? raw.trim() : "";
  }
  return values;
}

/** Redacts the free-text message body (potentially sensitive) before this
 * ever reaches a log line — only its length is recorded. */
function sanitizeForLog(values: ContactFormValues) {
  return { name: values.name, email: values.email, messageLength: values.message.length };
}

/**
 * Forwards a validated enquiry to the backend when `BACKEND_API_URL` is
 * configured in this environment. No API contract for a contact endpoint is
 * documented under `/docs` yet, so the exact path (`/contact`) and JSON
 * payload shape here are a reasonable best-effort assumption — confirm/
 * adjust once that contract is published.
 *
 * When `BACKEND_API_URL` is *not* configured, the enquiry is logged
 * server-side as an interim measure so nothing is silently lost during
 * development; this is treated as a successful delivery. Once a real
 * backend call is attempted, a network error or non-2xx response is
 * treated as a failed delivery and surfaced to the caller.
 */
async function deliverContactMessage(values: ContactFormValues): Promise<boolean> {
  const backendUrl = process.env.BACKEND_API_URL;

  if (!backendUrl) {
    console.info("[contact] BACKEND_API_URL not configured; logging enquiry locally only.", sanitizeForLog(values));
    return true;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${backendUrl}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(`[contact] backend responded with status ${response.status}`, sanitizeForLog(values));
      return false;
    }

    return true;
  } catch (error) {
    console.error("[contact] failed to reach backend", error, sanitizeForLog(values));
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Server Action backing `<ContactForm>`. Always re-validates on the server
 * (client-side checks are only a UX convenience, never trusted alone),
 * silently drops honeypot-flagged submissions without revealing that they
 * were caught, then attempts delivery.
 */
export async function submitContactMessage(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const honeypot = formData.get(CONTACT_HONEYPOT_FIELD);

  // A real visitor never sees or fills this field (see ContactForm). Report
  // success without doing anything further, so bots get no signal that
  // they were caught.
  if (typeof honeypot === "string" && honeypot.length > 0) {
    return {
      status: "success",
      message: "Thanks — we'll be in touch shortly.",
      errors: {},
      submittedAt: Date.now(),
    };
  }

  const values = readValues(formData);
  const errors = validateContactForm(values);
  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted fields and try again.",
      errors,
      submittedAt: Date.now(),
    };
  }

  const delivered = await deliverContactMessage(values);
  if (!delivered) {
    return {
      status: "error",
      message: "Something went wrong sending your message. Please try again, or email us directly.",
      errors: {},
      submittedAt: Date.now(),
    };
  }

  const firstName = values.name.split(" ")[0] ?? values.name;
  return {
    status: "success",
    message: `Thanks, ${firstName} — we'll be in touch shortly.`,
    errors: {},
    submittedAt: Date.now(),
  };
}
