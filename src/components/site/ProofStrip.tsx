import { proofPoints } from "@/data/home";

/** Static strip of the sectors and certifications behind the team (sourced
 * from the leadership bios), in place of a generic scrolling logo wall. */
export function ProofStrip() {
  return (
    <section className="proof" aria-label="Industries and certifications">
      <div className="wrap proof-grid">
        <div className="proof-group" data-reveal>
          <h2 className="proof-label">Industries we serve</h2>
          <ul>
            {proofPoints.industries.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="proof-group" data-reveal>
          <h2 className="proof-label">Leadership certifications</h2>
          <ul>
            {proofPoints.certifications.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
