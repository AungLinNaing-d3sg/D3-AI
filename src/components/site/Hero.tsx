import { heroContent } from "@/data/home";
import { InPageLink } from "./InPageLink";
import { ApprovalFlowCard, RevenueStreamCard } from "./demos/HeroDemos";

const Arrow = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M3 8h9.5M8.5 4l4 4-4 4" />
  </svg>
);

export function Hero() {
  const { eyebrow, titleBefore, titleHighlight, titleAfter, lead, trust } = heroContent;
  return (
    <section id="hero" aria-labelledby="hero-title">
      <div className="wrap hero-grid">
        <div>
          <p className="eyebrow" data-reveal>
            <span className="dot" aria-hidden="true" />
            {eyebrow}
          </p>
          <h1 id="hero-title" data-reveal>
            {titleBefore} <span className="grad">{titleHighlight}</span> {titleAfter}
          </h1>
          <p className="lead" data-reveal>
            {lead}
          </p>
          <div className="actions" data-reveal>
            <InPageLink className="btn btn-primary" href="#contact">
              Start a project <Arrow />
            </InPageLink>
            <InPageLink className="btn btn-ghost" href="#services">
              Explore services
            </InPageLink>
          </div>
          <dl className="trust" data-reveal>
            {trust.map((item) => (
              <div key={item.label}>
                <dt className="sr-only">{item.label}</dt>
                <dd>
                  <b>{item.value}</b>
                  <span aria-hidden="true">{item.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Product-style demo cards: decorative, sample data only. */}
        <div className="stage" data-reveal aria-hidden="true">
          <div className="float f1">
            <RevenueStreamCard />
          </div>
          <div className="float f2">
            <ApprovalFlowCard />
          </div>
        </div>
      </div>
    </section>
  );
}
