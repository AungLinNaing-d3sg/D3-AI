import Image from "next/image";
import { careersContent } from "@/data/home";
import { teamMembers } from "@/data/team";

export function Team() {
  return (
    <section id="team" aria-labelledby="team-title">
      <div className="wrap">
        <div className="section-head">
          <div>
            <h2 id="team-title" data-anim="skew-chars">
              The people <span className="accent">behind the work.</span>
            </h2>
          </div>
          <p className="lead" data-reveal>
            Decades of delivery across the public sector, education, logistics and transportation.
          </p>
        </div>
        <div className="team-grid">
          {teamMembers.map((member) => (
            <article className="person glass" data-anim="card-wipe" key={member.name}>
              <div className="person-head">
                <div className="person-photo">
                  <Image src={member.photo} alt={`Portrait of ${member.name}`} width={144} height={144} />
                </div>
                <div>
                  <h3>{member.name}</h3>
                  <p className="person-role">{member.role}</p>
                </div>
              </div>
              <ul>
                {member.bio.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
          ))}
          <article className="person careers" data-anim="card-wipe">
            <div>
              <h3>{careersContent.title}</h3>
              <p>{careersContent.text}</p>
            </div>
            <a className="btn btn-white" href={careersContent.href}>
              {careersContent.cta}
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}
