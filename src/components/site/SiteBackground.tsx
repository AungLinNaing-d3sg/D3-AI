/**
 * Fixed, decorative backdrop: a soft, static brand-tinted wash with a faint
 * dot grid behind the hero. Deliberately motionless so the product demos are
 * the only things that move on the page.
 */
export function SiteBackground() {
  return (
    <div className="bg" aria-hidden="true">
      <div className="dots" />
    </div>
  );
}
