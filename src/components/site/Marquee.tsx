import type { CSSProperties } from "react";
import { marqueeRows } from "@/data/home";

/** Four-point star separator (spins slowly, see globals.css). */
const Star = () => (
  <svg className="mq-star" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12C6.4 11.4 11.4 6.4 12 0z" />
  </svg>
);

/**
 * Industries and leadership certifications as two counter-moving rows. Each
 * word lights up as it crosses the centre and the rows lean with scroll
 * velocity (MotionDirector). Every half repeats the list twice so one half is
 * always wider than the screen for a seamless loop; the duplicate half is
 * hidden from assistive tech, and each row has a plain list for it.
 */
export function Marquee() {
  return (
    <section className="marquee" aria-label="Industries and certifications">
      {marqueeRows.map((row, r) => (
        <div className={`mq-row mq-row-${r + 1}`} key={row.label}>
          <ul className="sr-only" aria-label={row.label}>
            {row.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="marquee-track" data-dir={r % 2 ? 1 : -1} aria-hidden="true">
            {[0, 1].map((half) => (
              <div className="mq-half" key={half}>
                {[...row.items, ...row.items].map((item, i) => (
                  <span className="mq-item" key={`${item}-${i}`} style={{ "--f": 0 } as CSSProperties}>
                    <span className="mq-word">{item}</span>
                    <Star />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
