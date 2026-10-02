import { Background3D } from "./Background3D";

/**
 * Fixed, decorative backdrop: a soft brand-tinted wash and faint dot grid,
 * with the 3D discipline objects (Data / Dynamics / Digital) layered on top
 * once the page is idle. Everything here is aria-hidden decoration.
 */
export function SiteBackground() {
  return (
    <div className="bg" aria-hidden="true">
      <div className="dots" />
      <Background3D />
    </div>
  );
}
