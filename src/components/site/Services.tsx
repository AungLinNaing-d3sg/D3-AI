import type { ReactNode } from "react";
import { microsoftStack, serviceTiles } from "@/data/home";
import { services } from "@/data/services";
import { BiDashboardDemo, CodeToAppDemo, PipelineBoardDemo } from "./demos/ServiceDemos";

const demoFor: Record<(typeof serviceTiles)[number]["slug"], ReactNode> = {
  data: <BiDashboardDemo />,
  dynamics: <PipelineBoardDemo />,
  digital: <CodeToAppDemo />,
};

const tileClass: Record<(typeof serviceTiles)[number]["slug"], string> = {
  data: "tile t-data",
  dynamics: "tile t-dyn",
  digital: "tile t-dig",
};

export function Services() {
  return (
    <section id="services" aria-labelledby="services-title">
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="kicker" data-reveal>
              What we do
            </span>
            <h2 id="services-title" data-reveal>
              Three disciplines. <span className="grad">One partner.</span>
            </h2>
          </div>
          <p className="lead" data-reveal>
            Revolving around Microsoft technologies, this is our service portfolio.
          </p>
        </div>

        <div className="bento">
          {serviceTiles.map((tile) => {
            const service = services.find((s) => s.slug === tile.slug);
            if (!service) return null;
            return (
              <article className={tileClass[tile.slug]} data-reveal key={tile.slug}>
                <div className="tile-in">
                  <span className="tag">{tile.tag}</span>
                  <h3>{tile.title}</h3>
                  <p>{service.summary}</p>
                  <ul className="svc-list" aria-label={`${tile.title} services`}>
                    {service.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                  <div className="demo">{demoFor[tile.slug]}</div>
                </div>
              </article>
            );
          })}

          <article className="tile t-stat" data-reveal>
            <div className="tile-in">
              <span className="tag">Experience</span>
              <p>Senior leadership with two decades of industry experience.</p>
              <div className="stat-num">
                <span data-count="20">20</span>
                <em>+</em>
              </div>
              <p>years</p>
            </div>
          </article>

          <article className="tile t-sg" data-reveal>
            <div className="tile-in">
              <span className="tag">Based in</span>
              <p>Paya Lebar Square, serving teams across the region.</p>
              <div className="pin">
                <i aria-hidden="true" />
                Singapore
              </div>
            </div>
          </article>

          <article className="tile t-stack" data-reveal>
            <div className="tile-in">
              <span className="tag">Built on Microsoft</span>
              <p>Our service portfolio revolves around Microsoft technologies.</p>
              <div className="chips">
                {microsoftStack.map((tech) => (
                  <span key={tech}>{tech}</span>
                ))}
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
