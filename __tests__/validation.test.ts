import {
  CONTACT_MESSAGE_MIN_LENGTH,
  hasContactFormErrors,
  isValidEmail,
  validateContactForm,
} from "@/lib/validation";
import type { ContactFormValues } from "@/types";

const validValues: ContactFormValues = {
  name: "Jane Tan",
  email: "jane@example.com",
  company: "Example Pte Ltd",
  message: "Hello, we'd like to discuss a data & AI project with your team.",
  website: "",
};

describe("isValidEmail", () => {
  it("accepts well-formed email addresses", () => {
    expect(isValidEmail("jane@example.com")).toBe(true);
  });

  it("rejects addresses without an @ or domain", () => {
    expect(isValidEmail("jane")).toBe(false);
    expect(isValidEmail("jane@")).toBe(false);
    expect(isValidEmail("jane@example")).toBe(false);
  });
});

describe("validateContactForm", () => {
  it("returns no errors for a fully valid submission", () => {
    const errors = validateContactForm(validValues);
    expect(hasContactFormErrors(errors)).toBe(false);
  });

  it("flags a missing name", () => {
    const errors = validateContactForm({ ...validValues, name: "  " });
    expect(errors.name).toBeDefined();
  });

  it("flags an invalid email", () => {
    const errors = validateContactForm({ ...validValues, email: "not-an-email" });
    expect(errors.email).toBeDefined();
  });

  it("flags a message shorter than the minimum length", () => {
    const errors = validateContactForm({
      ...validValues,
      message: "a".repeat(CONTACT_MESSAGE_MIN_LENGTH - 1),
    });
    expect(errors.message).toBeDefined();
  });

  it("rejects submissions where the honeypot field is filled in", () => {
    const errors = validateContactForm({ ...validValues, website: "http://spam.example" });
    expect(errors.website).toBeDefined();
  });
});
