import { techStack } from "@/data/home";

/** Endless strip of the technologies we work with; the second copy exists
 * only to make the loop seamless, so it is hidden from assistive tech. */
export function TechMarquee() {
  return (
    <div className="marquee" role="region" aria-label="Technologies we work with">
      <div className="marquee-track">
        {[false, true].map((duplicate) => (
          <ul key={String(duplicate)} aria-hidden={duplicate || undefined}>
            {techStack.map((tech) => (
              <li key={tech}>{tech}</li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
