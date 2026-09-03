import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Avatar } from "@/components/ui/Avatar";
import { teamMembers } from "@/data/team";

export function TeamSection() {
  return (
    <section className="py-20 sm:py-28" aria-labelledby="team-heading">
      <Container className="flex flex-col gap-14">
        <Reveal>
          <SectionHeading
            id="team-heading"
            align="center"
            eyebrow="Meet our team"
            title="Real-world experience, industrial know-how"
            description="Each member is an expert in their own area of the IT landscape and across business domains. The same core team has worked together for years, on real projects."
          />
        </Reveal>

        <ul className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2" role="list">
          {teamMembers.map((member, index) => (
            <Reveal
              key={member.name}
              as="li"
              delayMs={index * 120}
              className="flex gap-5 rounded-3xl border border-white/10 bg-white/[0.03] p-7"
            >
              <Avatar initials={member.initials} name={member.name} />
              <div>
                <h3 className="text-lg font-semibold text-ink-50">{member.name}</h3>
                <p className="text-sm font-medium text-brand-300">{member.role}</p>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-400">
                  {member.bio.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
