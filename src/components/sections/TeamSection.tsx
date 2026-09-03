import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Avatar } from "@/components/ui/Avatar";
import { Reveal } from "@/components/motion/Reveal";
import { teamMembers } from "@/data/team";

/** Chapter 6 — Company/Team: the human side, after five chapters of
 * technology-led storytelling (see /docs/AboutUs.png "Meet Our Team"). */
export function TeamSection() {
  return (
    <Section id="company" ariaLabelledBy="company-heading">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          headingId="company-heading"
          eyebrow="Company"
          title="The team behind the technology"
          description="Each member is an expert in their own area of the IT landscape and across business domains — a team with genuine, real-world project experience and industrial know-how."
        />

        <div className="grid gap-8 sm:grid-cols-2">
          {teamMembers.map((member, index) => (
            <Reveal
              key={member.name}
              delay={index * 0.08}
              className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/[0.03] p-8"
            >
              <div className="flex items-center gap-4">
                <Avatar initials={member.initials} />
                <div>
                  <p className="font-display text-lg font-semibold text-ink-50">{member.name}</p>
                  <p className="text-sm text-brand-400">{member.role}</p>
                </div>
              </div>
              <ul className="flex flex-col gap-2 border-t border-white/10 pt-4">
                {member.bio.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-sm leading-relaxed text-ink-300">
                    <span aria-hidden="true" className="mt-2 h-1 w-1 flex-none rounded-full bg-brand-400" />
                    {line}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
