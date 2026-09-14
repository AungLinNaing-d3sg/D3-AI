/**
 * Shared "Send us a message" contact form validation rules.
 *
 * Imported by both the client component (`ContactForm`, for immediate
 * inline feedback) and the Server Action (`submitContactMessage`, as the
 * authoritative, never-trust-the-client check) so the two can never drift
 * out of sync.
 *
 * Field set mirrors the legacy D3-SG "Contact Us" page 1:1 — see
 * `/docs/ContactUs.png`: Name, Email, Phone Number, Message.
 */

export const CONTACT_FIELD_NAMES = ["name", "email", "phone", "message"] as const;

export type ContactFieldName = (typeof CONTACT_FIELD_NAMES)[number];

export type ContactFormValues = Record<ContactFieldName, string>;

export type ContactFormErrors = Partial<Record<ContactFieldName, string>>;

/**
 * Honeypot field name. Left blank by every real visitor (it is hidden from
 * both sighted users and assistive tech, and removed from tab order — see
 * `ContactForm`), so any non-empty value here means an automated bot filled
 * in every field it could find. The legacy page's image CAPTCHA is a known
 * accessibility barrier; this is a more accessible equivalent with the same
 * anti-spam intent.
 */
export const CONTACT_HONEYPOT_FIELD = "company";

export const CONTACT_NAME_MAX_LENGTH = 120;
export const CONTACT_EMAIL_MAX_LENGTH = 254;
export const CONTACT_PHONE_MIN_DIGITS = 7;
export const CONTACT_PHONE_MAX_DIGITS = 20;
export const CONTACT_MESSAGE_MIN_LENGTH = 10;
export const CONTACT_MESSAGE_MAX_LENGTH = 2000;

// Deliberately simple (not exhaustive per RFC 5322) — good enough to catch
// obvious typos without rejecting valid, less-common email formats.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Digits plus the punctuation real phone numbers use: + ( ) - and spaces.
const PHONE_CHARSET_PATTERN = /^[0-9+()\-\s]+$/;

export const CONTACT_FIELD_LABELS: Record<ContactFieldName, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone Number",
  message: "Message",
};

export function emptyContactFormValues(): ContactFormValues {
  return { name: "", email: "", phone: "", message: "" };
}

/**
 * Validates a single field in isolation (used for on-blur/on-change inline
 * feedback in the client). Returns an error message, or `undefined` when
 * the value is valid.
 */
export function validateContactField(field: ContactFieldName, rawValue: string): string | undefined {
  const value = rawValue.trim();

  switch (field) {
    case "name": {
      if (!value) return "Please enter your name.";
      if (value.length > CONTACT_NAME_MAX_LENGTH) {
        return `Name must be ${CONTACT_NAME_MAX_LENGTH} characters or fewer.`;
      }
      return undefined;
    }
    case "email": {
      if (!value) return "Please enter your email address.";
      if (value.length > CONTACT_EMAIL_MAX_LENGTH) {
        return `Email must be ${CONTACT_EMAIL_MAX_LENGTH} characters or fewer.`;
      }
      if (!EMAIL_PATTERN.test(value)) return "Please enter a valid email address.";
      return undefined;
    }
    case "phone": {
      if (!value) return "Please enter your phone number.";
      if (!PHONE_CHARSET_PATTERN.test(value)) {
        return "Phone number can only contain digits, spaces, and + ( ) -.";
      }
      const digitCount = value.replace(/\D/g, "").length;
      if (digitCount < CONTACT_PHONE_MIN_DIGITS || digitCount > CONTACT_PHONE_MAX_DIGITS) {
        return `Phone number must have between ${CONTACT_PHONE_MIN_DIGITS} and ${CONTACT_PHONE_MAX_DIGITS} digits.`;
      }
      return undefined;
    }
    case "message": {
      if (!value) return "Please enter a message.";
      if (value.length < CONTACT_MESSAGE_MIN_LENGTH) {
        return `Message must be at least ${CONTACT_MESSAGE_MIN_LENGTH} characters.`;
      }
      if (value.length > CONTACT_MESSAGE_MAX_LENGTH) {
        return `Message must be ${CONTACT_MESSAGE_MAX_LENGTH} characters or fewer.`;
      }
      return undefined;
    }
    default: {
      // Exhaustiveness guard: adding a new `ContactFieldName` without adding
      // a matching case here fails the build instead of silently skipping
      // validation for it.
      const exhaustiveCheck: never = field;
      return exhaustiveCheck;
    }
  }
}

/**
 * Validates the whole form, returning an error map keyed by field name. An
 * empty object means the submission is valid.
 */
export function validateContactForm(values: ContactFormValues): ContactFormErrors {
  const errors: ContactFormErrors = {};
  for (const field of CONTACT_FIELD_NAMES) {
    const message = validateContactField(field, values[field]);
    if (message) errors[field] = message;
  }
  return errors;
}
