interface GradientBackdropProps {
  variant?: "hero" | "section" | "cta";
  className?: string;
}

/**
 * Decorative, purely presentational animated gradient blobs used behind
 * hero/CTA sections for depth. Marked aria-hidden and pointer-events-none
 * so assistive tech and interaction are never affected.
 */
export function GradientBackdrop({ variant = "section", className = "" }: GradientBackdropProps) {
  const size = variant === "hero" ? "h-[42rem] w-[42rem]" : "h-[28rem] w-[28rem]";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
    >
      <div
        className={`absolute -top-40 left-1/2 -translate-x-1/2 rounded-full bg-brand-500/25 blur-[120px] animate-float-slow ${size}`}
      />
      <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-ink-500/30 blur-[100px] animate-float" />
      <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
    </div>
  );
}
