import { Hero } from "@/components/sections/Hero";
import { WhoWeAreSection } from "@/components/sections/WhoWeAreSection";
import { ServicesSection } from "@/components/sections/ServicesSection";
import { CTASection } from "@/components/sections/CTASection";

export default function HomePage() {
  return (
    <>
      <Hero />
      <WhoWeAreSection />
      <ServicesSection variant="preview" headingId="home-services-heading" />
      <CTASection />
    </>
  );
}
