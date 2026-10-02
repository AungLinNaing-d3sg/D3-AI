import { marqueeItems } from "@/data/home";

/** Sectors and certifications behind the team, as a scroll-reactive strip
 * (speed and direction follow scroll velocity — see MotionDirector). The
 * second copy only makes the loop seamless, so it is hidden from assistive
 * tech. */
export function Marquee() {
  return (
    <section className="marquee" aria-label="Industries and certifications">
      <div className="marquee-track">
        {[false, true].map((duplicate) => (
          <ul key={String(duplicate)} aria-hidden={duplicate || undefined}>
            {marqueeItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
