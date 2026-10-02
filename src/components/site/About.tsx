import { aboutContent, type ValueIcon } from "@/data/home";
import { PhoneChatDemo } from "./demos/PhoneChatDemo";

/** Line icons that draw themselves in on reveal (`pathLength` normalises the
 * stroke-dash animation in globals.css). */
function ValueGlyph({ icon }: { icon: ValueIcon }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {icon === "check" ? (
        <>
          <circle cx="12" cy="12" r="9" pathLength={1} />
          <path d="M8 12.5l2.6 2.6L16 9.5" pathLength={1} />
        </>
      ) : icon === "shield" ? (
        <>
          <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" pathLength={1} />
          <path d="M9 12l2 2 4-4" pathLength={1} />
        </>
      ) : (
        <>
          <circle cx="9" cy="12" r="5.5" pathLength={1} />
          <circle cx="15" cy="12" r="5.5" pathLength={1} />
        </>
      )}
    </svg>
  );
}

export function About() {
  const { title, titleHighlight, statement, values } = aboutContent;
  return (
    <section id="about" aria-labelledby="about-title">
      <div className="wrap about-grid">
        <div>
          <span className="kicker" data-reveal>
            Who we are
          </span>
          <h2 id="about-title" data-split>
            {title} <span className="grad">{titleHighlight}</span>
          </h2>
          <p className="statement" data-highlight>
            {statement}
          </p>
          <div className="values">
            {values.map((value) => (
              <div className="value" data-reveal key={value.title}>
                <ValueGlyph icon={value.icon} />
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </div>
            ))}
          </div>
        </div>
        <PhoneChatDemo />
      </div>
    </section>
  );
}
