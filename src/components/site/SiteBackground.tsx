import { Background3D } from "./Background3D";

/**
 * Fixed, decorative backdrop: a fine grid and soft brand glow, with the 3D
 * pearl sphere (components/three/background) layered on top once the page is
 * idle. Everything here is aria-hidden decoration.
 */
export function SiteBackground() {
  return (
    <div className="bg" aria-hidden="true">
      <div className="grid-lines" />
      <Background3D />
    </div>
  );
}
