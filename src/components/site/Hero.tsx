import { heroContent } from "@/data/home";
import { InPageLink } from "./InPageLink";

const Arrow = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M3 8h9.5M8.5 4l4 4-4 4" />
  </svg>
);

/** Title, one-line subtitle, two actions — the pearl sphere does the rest. */
export function Hero() {
  const { titleBefore, titleHighlight, titleAfter, subtitle } = heroContent;
  return (
    <section id="hero" aria-labelledby="hero-title">
      <div className="hero-inner">
        <h1 id="hero-title" data-anim="chars-rise">
          {titleBefore} <span className="accent">{titleHighlight}</span> {titleAfter}
        </h1>
        <p className="hero-sub" data-anim="scramble">
          {subtitle}
        </p>
        <div className="actions" data-reveal>
          <InPageLink className="btn btn-primary" href="#contact">
            Start a project <Arrow />
          </InPageLink>
          <InPageLink className="btn btn-ghost" href="#services">
            Services
          </InPageLink>
        </div>
      </div>
    </section>
  );
}
