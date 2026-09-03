import { Container } from "@/components/ui/Container";
import { GradientBackdrop } from "@/components/ui/GradientBackdrop";
import { LinkButton } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

interface CTASectionProps {
  title?: string;
  description?: string;
}

export function CTASection({
  title = "Ready to build your AI infused future?",
  description = "Tell us about your project and our team will get back to you shortly.",
}: CTASectionProps) {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <GradientBackdrop variant="cta" />
      <Container>
        <Reveal className="relative flex flex-col items-center gap-6 rounded-[2rem] border border-white/10 bg-white/[0.03] px-8 py-16 text-center sm:px-16">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl">
            {title}
          </h2>
          <p className="max-w-xl text-balance text-base leading-relaxed text-ink-300">
            {description}
          </p>
          <LinkButton href="/contact">Contact us</LinkButton>
        </Reveal>
      </Container>
    </section>
  );
}
