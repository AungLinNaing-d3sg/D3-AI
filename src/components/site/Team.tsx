import Image from "next/image";
import { teamMembers } from "@/data/team";

/**
 * Leadership as editorial profile rows — one wide frosted row per person
 * (large portrait, outline numeral, name/role, two-column bio) — so this
 * section reads differently from the card grids elsewhere on the page.
 */
export function Team() {
  return (
    <section id="team" aria-labelledby="team-title">
      <div className="wrap">
        <div className="section-head">
          <h2 id="team-title" data-anim="skew-chars">
            The people <span className="accent">behind the work.</span>
          </h2>
          <p className="lead" data-reveal>
            Decades of delivery across the public sector, education, logistics and transportation.
          </p>
        </div>
        <div className="profiles">
          {teamMembers.map((member, i) => (
            <article className="profile glass" data-anim="card-wipe" key={member.name}>
              <div className="profile-photo">
                <Image src={member.photo} alt={`Portrait of ${member.name}`} width={320} height={320} />
              </div>
              <div className="profile-body">
                <div className="profile-head">
                  <span className="numeral" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{member.name}</h3>
                    <p className="person-role">{member.role}</p>
                  </div>
                </div>
                <ul className="profile-bio">
                  {member.bio.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
