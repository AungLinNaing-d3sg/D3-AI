"use client";

import { useActionState, useRef, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { initialContactFormState, submitContactMessage } from "@/app/actions/contact";
import {
  CONTACT_FIELD_LABELS,
  CONTACT_FIELD_NAMES,
  CONTACT_HONEYPOT_FIELD,
  CONTACT_MESSAGE_MAX_LENGTH,
  emptyContactFormValues,
  validateContactField,
  validateContactForm,
  type ContactFieldName,
  type ContactFormErrors,
  type ContactFormValues,
} from "@/lib/validation/contactForm";

/** Glass inputs and focus light — see `.contact-field`/`.contact-input` in
 * globals.css. */
const inputClasses = "contact-input";

const fieldInputProps: Record<ContactFieldName, { type: string; autoComplete: string }> = {
  name: { type: "text", autoComplete: "name" },
  email: { type: "email", autoComplete: "email" },
  message: { type: "text", autoComplete: "off" },
};

/** Submit button. Split out so `useFormStatus` (which only works inside a
 * `<form>`) can drive its own pending label/disabled state. The same glass
 * pill as the rest of Chapter 08 (`.cta-pill`), with its arrow. */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="cta-pill w-full justify-center sm:w-auto">
      <span>{pending ? "Sending…" : "Send message"}</span>
      <svg
        aria-hidden="true"
        className="cta-pill-arrow"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 8h9.5M8.5 4l4 4-4 4" />
      </svg>
    </button>
  );
}

/**
 * "Send us a message" contact form (Chapter 08 — Final CTA): Name, Email,
 * Message — see CONTACT_FIELD_NAMES for why it's this compact.
 *
 * Client-side validation (`validateContactField`/`validateContactForm`,
 * shared with the Server Action) gives immediate inline feedback on blur
 * and blocks submission with focus moved to the first invalid field;
 * `submitContactMessage` re-runs the exact same rules authoritatively
 * before anything is delivered. `noValidate` replaces the browser's native
 * validation bubbles with these accessible inline errors, while
 * `required`/`type`/`maxLength` are kept for their semantic/assistive-tech
 * value.
 *
 * The legacy page's image CAPTCHA is replaced with a honeypot field that is
 * hidden from sighted users and assistive tech and removed from tab order —
 * a more accessible anti-spam equivalent (see CONTACT_HONEYPOT_FIELD).
 */
export function ContactForm() {
  const [state, formAction] = useActionState(submitContactMessage, initialContactFormState);
  const [values, setValues] = useState<ContactFormValues>(emptyContactFormValues());
  const [touched, setTouched] = useState<Partial<Record<ContactFieldName, boolean>>>({});
  const [clientErrors, setClientErrors] = useState<ContactFormErrors>({});
  // Tracks the last `state.submittedAt` this component has already reacted
  // to, so a fresh successful submission clears the (fully controlled)
  // fields exactly once. Following React's documented "adjusting state
  // during render" pattern (see react.dev/learn/you-might-not-need-an-effect)
  // instead of an Effect avoids an extra post-commit render.
  const [handledSubmittedAt, setHandledSubmittedAt] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  if (state.status === "success" && state.submittedAt !== handledSubmittedAt) {
    setHandledSubmittedAt(state.submittedAt);
    setValues(emptyContactFormValues());
    setTouched({});
    setClientErrors({});
  }

  // Once a submission has round-tripped and the server found problems,
  // those are authoritative; otherwise fall back to whatever the client
  // already knows from its own on-blur checks.
  const errors: ContactFormErrors =
    state.submittedAt > 0 && Object.keys(state.errors).length > 0 ? state.errors : clientErrors;

  function handleChange(field: ContactFieldName, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      setClientErrors((prev) => ({ ...prev, [field]: validateContactField(field, value) }));
    }
  }

  function handleBlur(field: ContactFieldName) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setClientErrors((prev) => ({ ...prev, [field]: validateContactField(field, values[field]) }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formErrors = validateContactForm(values);
    setClientErrors(formErrors);
    setTouched({ name: true, email: true, message: true });

    const firstInvalidField = CONTACT_FIELD_NAMES.find((field) => formErrors[field]);
    if (firstInvalidField) {
      event.preventDefault();
      formRef.current?.querySelector<HTMLElement>(`#contact-${firstInvalidField}`)?.focus();
    }
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="contact-form-heading"
      aria-describedby="contact-form-status"
      className="relative w-full max-w-xl text-left"
    >
      {/* Honeypot: visually hidden and out of both the accessible name and
          the tab order, so only an automated bot can ever fill it in. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-0 h-px w-px overflow-hidden">
        <label htmlFor="contact-company">Company</label>
        <input id="contact-company" name={CONTACT_HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(["name", "email"] as const).map((field) => (
          <div key={field} className="contact-field">
            <label htmlFor={`contact-${field}`} className="contact-label">
              {CONTACT_FIELD_LABELS[field]}{" "}
              <span aria-hidden="true" className="text-brand-400">
                *
              </span>
            </label>
            <input
              id={`contact-${field}`}
              name={field}
              type={fieldInputProps[field].type}
              autoComplete={fieldInputProps[field].autoComplete}
              required
              aria-required="true"
              aria-invalid={Boolean(errors[field])}
              aria-describedby={errors[field] ? `contact-${field}-error` : undefined}
              value={values[field]}
              onChange={(event) => handleChange(field, event.target.value)}
              onBlur={() => handleBlur(field)}
              className={inputClasses}
            />
            {errors[field] ? (
              <p id={`contact-${field}-error`} role="alert" className="mt-1.5 text-xs text-brand-300">
                {errors[field]}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="contact-field mt-4">
        <label htmlFor="contact-message" className="contact-label">
          {CONTACT_FIELD_LABELS.message}{" "}
          <span aria-hidden="true" className="text-brand-400">
            *
          </span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={4}
          required
          aria-required="true"
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
          maxLength={CONTACT_MESSAGE_MAX_LENGTH}
          value={values.message}
          onChange={(event) => handleChange("message", event.target.value)}
          onBlur={() => handleBlur("message")}
          className={`${inputClasses} resize-y`}
        />
        {errors.message ? (
          <p id="contact-message-error" role="alert" className="mt-1.5 text-xs text-brand-300">
            {errors.message}
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SubmitButton />
        <p
          id="contact-form-status"
          role="status"
          aria-live="polite"
          className={
            state.status === "idle"
              ? "sr-only"
              : state.status === "success"
                ? "text-sm font-medium text-emerald-400"
                : "text-sm font-medium text-brand-300"
          }
        >
          {state.message}
        </p>
      </div>
    </form>
  );
}
