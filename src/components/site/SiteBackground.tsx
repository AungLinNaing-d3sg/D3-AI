import { HeroParticles } from "./HeroParticles";

/**
 * Fixed, decorative backdrop: a fine grid and soft brand glow under the
 * particle layer that forms the D3SG logo in the hero and drifts behind the
 * rest of the page. Everything here is aria-hidden decoration.
 */
export function SiteBackground() {
  return (
    <div className="bg" aria-hidden="true">
      <div className="grid-lines" />
      <HeroParticles />
    </div>
  );
}
