import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactForm } from "@/components/forms/ContactForm";

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^name$/i), "Jane Tan");
  await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
  await user.type(
    screen.getByLabelText(/message/i),
    "Hello, we'd like to discuss a data & AI project with your team."
  );
}

describe("ContactForm", () => {
  it("shows validation errors when submitted empty", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByText(/please enter your name/i)).toBeInTheDocument();
    expect(screen.getByText(/please enter your email address/i)).toBeInTheDocument();
    expect(screen.getByText(/please enter a message/i)).toBeInTheDocument();
  });

  it("clears the name error once a valid name is entered and the field loses focus", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.click(screen.getByRole("button", { name: /send message/i }));
    expect(await screen.findByText(/please enter your name/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^name$/i), "Jane Tan");
    await user.tab();

    expect(screen.queryByText(/please enter your name/i)).not.toBeInTheDocument();
  });

  it("shows a live character counter for the message field", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    const message = screen.getByLabelText(/message/i);
    await user.type(message, "Hello there");

    expect(screen.getByText("11/2000")).toBeInTheDocument();
  });

  it("does not submit when the required fields are missing (edge case: whitespace-only name)", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText(/^name$/i), "   ");
    await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
    await user.type(screen.getByLabelText(/message/i), "A valid message body.");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(await screen.findByText(/please enter your name/i)).toBeInTheDocument();
    expect(screen.queryByText(/thanks! your email client/i)).not.toBeInTheDocument();
  });

  it("rejects submission when the honeypot field is filled (bot mitigation)", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await fillValidForm(user);
    // The honeypot input is hidden from sighted users via aria-hidden/tabIndex=-1,
    // but is still present in the DOM and addressable by id for this test.
    const honeypot = document.getElementById("website") as HTMLInputElement;
    await user.type(honeypot, "http://spam.example");

    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(screen.queryByText(/thanks! your email client/i)).not.toBeInTheDocument();
  });

  it("shows a submitting state and then a success message on valid submission", async () => {
    const user = userEvent.setup();
    // jsdom logs (but does not throw on) "not implemented: navigation" when
    // `window.location.href` is assigned a mailto: URL — swallow that one
    // expected virtual-console error so the test output stays clean.
    const jsdomError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(<ContactForm />);
    await fillValidForm(user);

    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();

    await waitFor(() =>
      expect(screen.getByText(/thanks! your email client/i)).toBeInTheDocument()
    );

    // Form resets after a successful submission.
    expect(screen.getByLabelText(/^name$/i)).toHaveValue("");

    jsdomError.mockRestore();
  });
});
