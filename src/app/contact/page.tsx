import type { Metadata } from "next";
import { PageHero } from "@/components/sections/PageHero";
import { ContactForm } from "@/components/forms/ContactForm";
import { ContactInfo } from "@/components/sections/ContactInfo";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the D3-SG team about your Data, Dynamics, or Digital project.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact us"
        title="Let's start a conversation"
        description="Share a few details about your project and we'll get back to you shortly."
        currentLabel="Contact Us"
      />

      <section className="pb-24 sm:pb-32">
        <Container className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <Reveal className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:p-10">
            <h2 className="text-xl font-semibold text-ink-50">Send us a message</h2>
            <p className="mt-2 text-sm text-ink-400">
              Fields marked required must be filled before your message can be sent.
            </p>
            <div className="mt-8">
              <ContactForm />
            </div>
          </Reveal>

          <Reveal delayMs={120}>
            <ContactInfo />
          </Reveal>
        </Container>
      </section>
    </>
  );
}
