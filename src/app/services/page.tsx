import type { Metadata } from "next";
import { PageHero } from "@/components/sections/PageHero";
import { ServicesSection } from "@/components/sections/ServicesSection";
import { CTASection } from "@/components/sections/CTASection";

export const metadata: Metadata = {
  title: "Our Services",
  description:
    "Explore D3-SG's service portfolio across Data (Analytics, ML & AI), Dynamics (365 & Power Platform), and Digital (Development).",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Our services"
        title="Revolving around Microsoft technologies"
        description="These are our service portfolio — from strategy and architecture through to a running, supported solution."
        currentLabel="Our Services"
      />
      <ServicesSection variant="full" headingId="services-page-heading" />
      <CTASection />
    </>
  );
}
