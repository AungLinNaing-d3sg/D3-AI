import {
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_MESSAGE_MIN_LENGTH,
  CONTACT_NAME_MAX_LENGTH,
  emptyContactFormValues,
  validateContactField,
  validateContactForm,
  type ContactFormValues,
} from "@/lib/validation/contactForm";

function validValues(overrides: Partial<ContactFormValues> = {}): ContactFormValues {
  return {
    name: "Ada Lovelace",
    email: "ada@example.com",
    message: "Hello, I'd like to learn more about your services.",
    ...overrides,
  };
}

describe("validateContactField", () => {
  it("accepts a fully valid set of values with no errors", () => {
    const values = validValues();
    expect(validateContactField("name", values.name)).toBeUndefined();
    expect(validateContactField("email", values.email)).toBeUndefined();
    expect(validateContactField("message", values.message)).toBeUndefined();
  });

  it("requires a name", () => {
    expect(validateContactField("name", "")).toMatch(/enter your name/i);
    expect(validateContactField("name", "   ")).toMatch(/enter your name/i);
  });

  it("rejects a name over the max length", () => {
    const tooLong = "a".repeat(CONTACT_NAME_MAX_LENGTH + 1);
    expect(validateContactField("name", tooLong)).toMatch(/characters or fewer/i);
  });

  it("requires an email", () => {
    expect(validateContactField("email", "")).toMatch(/enter your email/i);
  });

  it("rejects a malformed email", () => {
    expect(validateContactField("email", "not-an-email")).toMatch(/valid email/i);
    expect(validateContactField("email", "missing@domain")).toMatch(/valid email/i);
  });

  it("requires a message", () => {
    expect(validateContactField("message", "")).toMatch(/enter a message/i);
  });

  it("rejects a message that is too short", () => {
    expect(validateContactField("message", "hi")).toMatch(/at least 10 characters/i);
  });

  it("rejects a message over the max length", () => {
    const tooLong = "a".repeat(CONTACT_MESSAGE_MAX_LENGTH + 1);
    expect(validateContactField("message", tooLong)).toMatch(/characters or fewer/i);
  });

  it("trims whitespace before validating", () => {
    const padded = `  ${"a".repeat(CONTACT_MESSAGE_MIN_LENGTH)}  `;
    expect(validateContactField("message", padded)).toBeUndefined();
  });
});

describe("validateContactForm", () => {
  it("returns an empty error map for a fully valid submission", () => {
    expect(validateContactForm(validValues())).toEqual({});
  });

  it("collects one error per invalid field, keyed by field name", () => {
    const errors = validateContactForm(emptyContactFormValues());
    expect(Object.keys(errors).sort()).toEqual(["email", "message", "name"]);
  });

  it("only reports errors for the fields that are actually invalid", () => {
    const errors = validateContactForm(validValues({ email: "invalid" }));
    expect(errors).toEqual({ email: expect.stringMatching(/valid email/i) });
  });
});
