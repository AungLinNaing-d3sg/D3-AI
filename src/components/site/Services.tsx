import type { ReactNode } from "react";
import { serviceTiles } from "@/data/home";
import { services } from "@/data/services";
import { BiDashboardDemo, PipelineBoardDemo } from "./demos/ServiceDemos";
import { CodeToAppDemo } from "./demos/CodeToAppDemo";

const demoFor: Record<(typeof serviceTiles)[number]["slug"], ReactNode> = {
  data: <BiDashboardDemo />,
  dynamics: <PipelineBoardDemo />,
  digital: <CodeToAppDemo />,
};

/** Three glass panels; on wide screens the section pins and the panels
 * travel sideways as you scroll (MotionDirector), on small screens they stack. */
export function Services() {
  return (
    <section id="services" aria-labelledby="services-title">
      <div className="wrap section-head">
        <h2 id="services-title" data-anim="mask-lines">
          Three disciplines. <span className="accent">One partner.</span>
        </h2>
        <p className="lead" data-reveal>
          Revolving around Microsoft technologies, this is our service portfolio.
        </p>
      </div>
      <div className="h-pin">
        <div className="panels">
          {serviceTiles.map((tile, i) => {
            const service = services.find((s) => s.slug === tile.slug);
            if (!service) return null;
            return (
              <article className="panel glass" key={tile.slug}>
                <span className="numeral" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 data-anim="panel-title">{tile.title}</h3>
                  <p>{service.summary}</p>
                  <ul className="svc-list" aria-label={`${tile.title} services`}>
                    {service.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </div>
                <div>{demoFor[tile.slug]}</div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
