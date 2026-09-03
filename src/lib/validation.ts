import type { ContactFormErrors, ContactFormValues } from "@/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CONTACT_MESSAGE_MIN_LENGTH = 10;
export const CONTACT_MESSAGE_MAX_LENGTH = 2000;
export const CONTACT_NAME_MAX_LENGTH = 100;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

/**
 * Pure, dependency-free client-side validation for the contact form.
 * Returns a map of field -> error message; an empty object means the form
 * is valid. Kept separate from the component so it is trivially unit
 * testable and reusable if a second contact surface is added later.
 */
export function validateContactForm(
  values: ContactFormValues
): ContactFormErrors {
  const errors: ContactFormErrors = {};

  const name = values.name.trim();
  if (!name) {
    errors.name = "Please enter your name.";
  } else if (name.length > CONTACT_NAME_MAX_LENGTH) {
    errors.name = `Name must be ${CONTACT_NAME_MAX_LENGTH} characters or fewer.`;
  }

  const email = values.email.trim();
  if (!email) {
    errors.email = "Please enter your email address.";
  } else if (!isValidEmail(email)) {
    errors.email = "Please enter a valid email address.";
  }

  const message = values.message.trim();
  if (!message) {
    errors.message = "Please enter a message.";
  } else if (message.length < CONTACT_MESSAGE_MIN_LENGTH) {
    errors.message = `Message must be at least ${CONTACT_MESSAGE_MIN_LENGTH} characters.`;
  } else if (message.length > CONTACT_MESSAGE_MAX_LENGTH) {
    errors.message = `Message must be ${CONTACT_MESSAGE_MAX_LENGTH} characters or fewer.`;
  }

  // Honeypot: real visitors never populate this hidden field. If it has a
  // value, treat the submission as invalid (best-effort bot mitigation).
  if (values.website.trim().length > 0) {
    errors.website = "Submission rejected.";
  }

  return errors;
}

export function hasContactFormErrors(errors: ContactFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
