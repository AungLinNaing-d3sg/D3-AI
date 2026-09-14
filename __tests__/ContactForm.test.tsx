import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactForm } from "@/components/sections/ContactForm";

describe("ContactForm", () => {
  // The Server Action's delivery step only attempts a real network call when
  // `BACKEND_API_URL` is configured (see src/app/actions/contact.ts). Force
  // it unset for these tests so they deterministically exercise the
  // local-log fallback path instead of depending on outbound network access
  // to whatever this env happens to point to.
  const originalBackendApiUrl = process.env.BACKEND_API_URL;

  beforeEach(() => {
    delete process.env.BACKEND_API_URL;
  });

  afterAll(() => {
    if (originalBackendApiUrl !== undefined) {
      process.env.BACKEND_API_URL = originalBackendApiUrl;
    }
  });

  it("renders the Name, Email, Phone Number, and Message fields plus a submit button", () => {
    render(<ContactForm />);
    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^message/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
  });

  it("keeps the honeypot field out of the accessible name and tab order", () => {
    render(<ContactForm />);
    const honeypot = document.querySelector('input[name="company"]');
    expect(honeypot).not.toBeNull();
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(
      screen.queryByRole("textbox", { name: /^company$/i })
    ).not.toBeInTheDocument();
  });

  it("blocks submission and shows accessible inline errors when all fields are empty", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.click(screen.getByRole("button", { name: /send message/i }));

    const alerts = await screen.findAllByRole("alert");
    expect(alerts).toHaveLength(4);
    expect(screen.getByLabelText(/^name/i)).toHaveFocus();
  });

  it("clears a field's error on blur once it is corrected", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    const emailInput = screen.getByLabelText(/^email/i);
    await user.click(emailInput);
    await user.tab();
    expect(await screen.findByText(/enter your email/i)).toBeInTheDocument();

    await user.type(emailInput, "person@example.com");
    await user.tab();
    expect(screen.queryByText(/enter your email/i)).not.toBeInTheDocument();
  });

  it("submits successfully with valid input and shows a personalized confirmation", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText(/^name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/^email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/^phone number/i), "+65 8772 8128");
    await user.type(screen.getByLabelText(/^message/i), "Hello, I'd like to learn more about your services.");

    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByText(/thanks, ada/i)).toBeInTheDocument();
    expect(screen.queryAllByRole("alert")).toHaveLength(0);
  });
});
