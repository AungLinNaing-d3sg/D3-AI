import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";
import { GradientBackdrop } from "@/components/ui/GradientBackdrop";

export default function NotFound() {
  return (
    <section className="relative flex min-h-[70vh] items-center overflow-hidden py-24">
      <GradientBackdrop />
      <Container className="flex flex-col items-center gap-6 text-center">
        <span className="text-sm font-semibold tracking-wide text-brand-400 uppercase">404</span>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl">
          We couldn&apos;t find that page
        </h1>
        <p className="max-w-md text-balance text-base text-ink-300">
          The page you&apos;re looking for may have moved or no longer exists.
        </p>
        <LinkButton href="/">Back to home</LinkButton>
      </Container>
    </section>
  );
}
