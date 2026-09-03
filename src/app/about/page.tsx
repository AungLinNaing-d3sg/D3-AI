import type { Metadata } from "next";
import { PageHero } from "@/components/sections/PageHero";
import { WhoWeAreSection } from "@/components/sections/WhoWeAreSection";
import { TeamSection } from "@/components/sections/TeamSection";
import { CTASection } from "@/components/sections/CTASection";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "D3-SG is a Singapore-based IT solutions provider. Meet the team behind our Data, Dynamics, and Digital service portfolio.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title="Who we are"
        description="A Singapore-based IT solutions provider, working alongside partners to serve your organisation's varied IT transformation needs."
        currentLabel="About Us"
      />
      <WhoWeAreSection showCta={false} />
      <TeamSection />
      <CTASection
        title="Let's work together"
        description="Talk to our leadership team about your next Data, Dynamics, or Digital initiative."
      />
    </>
  );
}
