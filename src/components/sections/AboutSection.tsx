"use client";

import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import Image from "next/image";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/motion/Reveal";
import { useJourneyFrame } from "@/hooks/useJourneyFrame";
import type { JourneyState } from "@/lib/motion/journeyState";
import { aboutContent, leaderHighlights } from "@/data/about";
import { aboutTeamRanges } from "@/data/journey";
import { useLeaderDossier } from "./useLeaderDossier";

/**
 * Chapter 02 — About Us, presented like the light redesign's Team section
 * (development_v2): copy reveals, then holographic leader "dossier" cards.
 * On wide screens the leadership stage sticks while the cards stack over one
 * another, with an index that tracks (and jumps to) the leader in front;
 * portraits scan in, stats count up, and cards tilt towards the pointer
 * (useLeaderDossier). The 3D identity emblem and orbiting team behind it
 * (three/scenes/AboutScene.tsx) are untouched: the card matching the node
 * the scene highlights is still marked `data-active` every frame.
 */
export function AboutSection() {
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const stageRef = useLeaderDossier();

  const onFrame = useCallback((state: JourneyState) => {
    const local = state.progress.about;
    aboutTeamRanges.forEach((range, index) => {
      const card = cardRefs.current[index];
      if (!card) return;
      card.dataset.active = local >= range.start && local < range.end ? "true" : "false";
    });
  }, []);

  useJourneyFrame(onFrame);

  // Glass cards (.glass-card) light their edge and spotlight where the
  // mouse is: one delegated listener writes --mx/--my on the hovered card.
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const card = (event.target as Element | null)?.closest<HTMLElement>(".about-v2-value.glass-card, .dossier-inner.glass-card");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // The value row crossing the middle of the screen is marked active (the
  // same lit state as hover), so touch screens get it too.
  const valuesRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const rows = Array.from(valuesRef.current?.children ?? []) as HTMLElement[];
    if (!rows.length || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => (entry.target as HTMLElement).setAttribute("data-active", String(entry.isIntersecting))),
      { rootMargin: "-46% 0px -46% 0px" }
    );
    rows.forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, []);

  const { title, titleHighlight, statement, values } = aboutContent;

  return (
    <Section stageId="about" ariaLabelledBy="about-heading" className="min-h-[75vh] md:min-h-[95vh] lg:min-h-[105vh]">
      <Container data-depth-exit className="about-v2 grid gap-10 pt-16 md:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div>
          <Reveal as="h2" id="about-heading" variant="maskLines" className="v2-heading">
            {title} <span className="v2-accent">{titleHighlight}</span>
          </Reveal>
          <Reveal as="p" variant="scrubWords" className="about-v2-statement">
            {statement}
          </Reveal>
        </div>
        <ul ref={valuesRef} className="about-v2-values lg:mt-2">
          {values.map((value, index) => (
            <Reveal as="li" variant="wipe" delay={index * 0.08} className="about-v2-value v2-glass glass-card" key={value.title}>
              <span className="card-spot" aria-hidden="true" />
              <span className="card-edge" aria-hidden="true" />
              <span className="about-v2-rail" aria-hidden="true" />
              <h3>{value.title}</h3>
              <p>{value.text}</p>
            </Reveal>
          ))}
        </ul>
      </Container>

      {/* Leadership stage: sticky on wide screens (no GSAP pin, so the
          depth-exit transforms on neighbouring content can't break it). */}
      <div ref={stageRef} className="dossier-stage" style={{ "--dossier-steps": aboutTeamRanges.length - 1 } as CSSProperties}>
        <div className="dossier-sticky">
          <Container className="dossier-grid">
            <div className="dossier-side">
              <Reveal as="h3" variant="skewChars" className="v2-heading dossier-title">
                The people <span className="v2-accent">behind the work.</span>
              </Reveal>
              <nav className="dossier-index" aria-label="Leaders">
                <span className="dossier-progress" aria-hidden="true">
                  <i />
                </span>
                {aboutTeamRanges.map(({ member }, i) => (
                  <button type="button" className={`dossier-index-item${i === 0 ? " is-active" : ""}`} data-leader-jump={i} key={member.name}>
                    <span className="v2-edge" aria-hidden="true" />
                    <span className="dossier-index-num">{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <b>{member.name}</b>
                      <small>{member.role}</small>
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="dossier-cards">
              {aboutTeamRanges.map(({ member }, i) => {
                const facts = leaderHighlights[member.name];
                return (
                  <article
                    className="dossier"
                    data-leader={i}
                    data-active="false"
                    ref={(node) => {
                      cardRefs.current[i] = node;
                    }}
                    aria-labelledby={`leader-${i}`}
                    key={member.name}
                  >
                    <div className="dossier-inner v2-glass glass-card" data-tilt3d>
                      <span className="card-edge" aria-hidden="true" />
                      <span className="dossier-sheen" aria-hidden="true" />
                      <span className="v2-hud tl" aria-hidden="true" />
                      <span className="v2-hud br" aria-hidden="true" />
                      <div className="dossier-photo">
                        <svg className="dossier-orbit" viewBox="0 0 200 200" aria-hidden="true">
                          <circle cx="100" cy="100" r="96" />
                          <circle cx="100" cy="100" r="84" />
                        </svg>
                        <div className="dossier-frame">
                          <Image src={member.photo} alt={`Portrait of ${member.name}`} width={400} height={400} sizes="(min-width: 1024px) 16rem, 60vw" />
                          <span className="dossier-scan" aria-hidden="true" />
                        </div>
                        <span className="dossier-id" aria-hidden="true">
                          D3-SG · {String(i + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="dossier-body">
                        <p className="v2-role">{member.role}</p>
                        <h3 id={`leader-${i}`} className="dossier-name">
                          {member.name}
                        </h3>
                        {facts ? (
                          <>
                            <p className="dossier-stat">
                              <b>
                                <span data-count={facts.stat}>{facts.stat}</span>+
                              </b>
                              <span className="dossier-stat-label">{facts.statLabel}</span>
                            </p>
                            <ul className="dossier-creds" aria-label="Credentials">
                              {facts.credentials.map((c) => (
                                <li key={c}>{c}</li>
                              ))}
                            </ul>
                          </>
                        ) : null}
                        <ul className="v2-bullets dossier-bio">
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
          </Container>
        </div>
      </div>
    </Section>
  );
}
