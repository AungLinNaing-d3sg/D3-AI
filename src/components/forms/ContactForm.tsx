"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/data/site";
import {
  CONTACT_MESSAGE_MAX_LENGTH,
  hasContactFormErrors,
  validateContactForm,
} from "@/lib/validation";
import type { ContactFormErrors, ContactFormStatus, ContactFormValues } from "@/types";

const initialValues: ContactFormValues = {
  name: "",
  email: "",
  company: "",
  message: "",
  website: "",
};

type FieldName = keyof ContactFormValues;

/**
 * This project does not yet have a documented backend contact endpoint
 * (see /docs and scripts/.env.dev — only a generic BACKEND_API_URL is
 * defined, with no contact-form contract). Rather than guess at an API
 * shape, submitting the validated form opens the visitor's email client
 * with the message pre-filled, addressed to the published company inbox.
 * Swap this out for a real `fetch(...)` call once a contact endpoint is
 * documented under /docs.
 */
function buildMailto(values: ContactFormValues): string {
  const subject = `Website enquiry from ${values.name}`;
  const bodyLines = [
    values.company ? `Company: ${values.company}` : null,
    `Email: ${values.email}`,
    "",
    values.message,
  ].filter((line): line is string => line !== null);

  const params = new URLSearchParams({
    subject,
    body: bodyLines.join("\n"),
  });

  return `mailto:${siteConfig.email}?${params.toString()}`;
}

export function ContactForm() {
  const [values, setValues] = useState<ContactFormValues>(initialValues);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [status, setStatus] = useState<ContactFormStatus>("idle");
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const messageLength = values.message.length;

  function updateField<K extends FieldName>(field: K, value: ContactFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleBlur(field: FieldName) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validateContactForm({ ...values }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateContactForm(values);
    setErrors(validationErrors);
    setTouched({ name: true, email: true, message: true });

    if (hasContactFormErrors(validationErrors)) {
      setStatus("idle");
      if (validationErrors.name) nameRef.current?.focus();
      else if (validationErrors.email) emailRef.current?.focus();
      else if (validationErrors.message) messageRef.current?.focus();
      return;
    }

    setStatus("submitting");

    try {
      // Simulate a brief network round-trip so the loading state is visible;
      // replace with a real API call when a backend contract exists.
      await new Promise((resolve) => setTimeout(resolve, 500));

      window.location.href = buildMailto(values);
      setStatus("success");
      setValues(initialValues);
      setTouched({});
    } catch {
      setStatus("error");
    }
  }

  const isSubmitting = status === "submitting";

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6" aria-describedby="contact-form-status">
      {/* Honeypot field — hidden from sighted/keyboard users, bots often fill every field. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(event) => updateField("website", event.target.value)}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-medium text-ink-100">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            onBlur={() => handleBlur("name")}
            ref={nameRef}
            aria-invalid={Boolean(touched.name && errors.name)}
            aria-describedby={touched.name && errors.name ? "name-error" : undefined}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-ink-50 outline-none transition-colors placeholder:text-ink-500 focus:border-brand-400"
            placeholder="Jane Tan"
          />
          {touched.name && errors.name ? (
            <p id="name-error" role="alert" className="text-xs text-brand-300">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium text-ink-100">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={values.email}
            onChange={(event) => updateField("email", event.target.value)}
            onBlur={() => handleBlur("email")}
            ref={emailRef}
            aria-invalid={Boolean(touched.email && errors.email)}
            aria-describedby={touched.email && errors.email ? "email-error" : undefined}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-ink-50 outline-none transition-colors placeholder:text-ink-500 focus:border-brand-400"
            placeholder="jane@company.com"
          />
          {touched.email && errors.email ? (
            <p id="email-error" role="alert" className="text-xs text-brand-300">
              {errors.email}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="company" className="text-sm font-medium text-ink-100">
          Company <span className="font-normal text-ink-400">(optional)</span>
        </label>
        <input
          id="company"
          name="company"
          type="text"
          autoComplete="organization"
          value={values.company}
          onChange={(event) => updateField("company", event.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-ink-50 outline-none transition-colors placeholder:text-ink-500 focus:border-brand-400"
          placeholder="Company Pte Ltd"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="message" className="text-sm font-medium text-ink-100">
            Message
          </label>
          <span className="text-xs text-ink-400">
            {messageLength}/{CONTACT_MESSAGE_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          maxLength={CONTACT_MESSAGE_MAX_LENGTH}
          value={values.message}
          onChange={(event) => updateField("message", event.target.value)}
          onBlur={() => handleBlur("message")}
          ref={messageRef}
          aria-invalid={Boolean(touched.message && errors.message)}
          aria-describedby={touched.message && errors.message ? "message-error" : undefined}
          className="resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-ink-50 outline-none transition-colors placeholder:text-ink-500 focus:border-brand-400"
          placeholder="Tell us a little about your project..."
        />
        {touched.message && errors.message ? (
          <p id="message-error" role="alert" className="text-xs text-brand-300">
            {errors.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-fit">
        {isSubmitting ? "Sending..." : "Send message"}
      </Button>

      <div id="contact-form-status" role="status" aria-live="polite" className="min-h-[1.5rem] text-sm">
        {status === "success" ? (
          <p className="text-brand-300">
            Thanks! Your email client should now open with your message ready to send. If it
            didn&apos;t, email us directly at{" "}
            <a href={`mailto:${siteConfig.email}`} className="underline underline-offset-2">
              {siteConfig.email}
            </a>
            .
          </p>
        ) : null}
        {status === "error" ? (
          <p className="text-brand-300">
            Something went wrong opening your email client. Please reach us directly at{" "}
            <a href={`mailto:${siteConfig.email}`} className="underline underline-offset-2">
              {siteConfig.email}
            </a>{" "}
            or{" "}
            <a href={`tel:${siteConfig.phoneHref}`} className="underline underline-offset-2">
              {siteConfig.phone}
            </a>
            .
          </p>
        ) : null}
      </div>
    </form>
  );
}
