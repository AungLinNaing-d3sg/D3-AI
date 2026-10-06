import Image from "next/image";
import { leaderHighlights } from "@/data/home";
import { teamMembers } from "@/data/team";

/**
 * Leadership as holographic "dossier" cards. On wide screens the stage pins
 * and the cards stack over each other as you scroll, with an index that
 * tracks (and jumps to) the active leader; cards tilt towards the pointer
 * with a following sheen, and each portrait is revealed by a scan line
 * (MotionDirector). On small screens the cards simply stack.
 */
export function Team() {
  return (
    <section id="team" aria-labelledby="team-title">
      <div className="wrap section-head">
        <h2 id="team-title" data-anim="skew-chars">
          The people <span className="accent">behind the work.</span>
        </h2>
        <p className="lead" data-reveal>
          Decades of delivery across the public sector, education, logistics and transportation.
        </p>
      </div>

      <div className="team-stage">
        <div className="wrap team-grid">
          <nav className="team-index" aria-label="Leaders">
            <span className="team-progress" aria-hidden="true">
              <i />
            </span>
            {teamMembers.map((member, i) => (
              <button type="button" className={`team-index-item${i === 0 ? " is-active" : ""}`} data-leader-jump={i} key={member.name}>
                <span className="team-index-num">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <b>{member.name}</b>
                  <small>{member.role}</small>
                </span>
              </button>
            ))}
          </nav>

          <div className="leaders">
            {teamMembers.map((member, i) => {
              const facts = leaderHighlights[member.name];
              return (
                <article className="leader" data-leader={i} key={member.name} aria-labelledby={`leader-${i}`}>
                  <div className="leader-inner glass" data-tilt3d>
                    <span className="leader-sheen" aria-hidden="true" />
                    <span className="hud tl" aria-hidden="true" />
                    <span className="hud tr" aria-hidden="true" />
                    <span className="hud bl" aria-hidden="true" />
                    <span className="hud br" aria-hidden="true" />

                    <div className="leader-photo">
                      <svg className="leader-orbit" viewBox="0 0 200 200" aria-hidden="true">
                        <circle cx="100" cy="100" r="96" />
                        <circle cx="100" cy="100" r="84" />
                      </svg>
                      <div className="leader-frame">
                        <Image src={member.photo} alt={`Portrait of ${member.name}`} width={480} height={480} sizes="(min-width: 1024px) 22rem, 70vw" />
                        <span className="leader-scan" aria-hidden="true" />
                      </div>
                      <span className="leader-id" aria-hidden="true">
                        D3-SG · {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="leader-body">
                      <p className="person-role">{member.role}</p>
                      <h3 id={`leader-${i}`}>{member.name}</h3>
                      {facts ? (
                        <>
                          <p className="leader-stat">
                            <b>
                              <span data-count={facts.stat}>{facts.stat}</span>+
                            </b>
                            <span className="leader-stat-label">{facts.statLabel}</span>
                          </p>
                          <ul className="leader-creds" aria-label="Credentials">
                            {facts.credentials.map((c) => (
                              <li key={c}>{c}</li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                      <ul className="leader-bio">
                        {member.bio.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
