import type { ReactNode } from "react";

interface GameFrameProps {
  eyebrow: string;
  title: string;
  description: string;
  /** Announced to assistive tech via a live region whenever it changes —
   * every game passes its own current status sentence (e.g. "3 of 6 signals
   * locked", "Path complete — 92% accuracy"). */
  status: string;
  /** The game's own interactive area (3D canvas + accessible hit targets). */
  children: ReactNode;
  /** Play/Replay/Skip/Back controls — kept as a slot so each game can decide
   * exactly which controls make sense for its current phase. */
  controls: ReactNode;
  /** Tailwind text-color utility class for the eyebrow + glow accents, kept
   * per-game so the four experiences read as distinct while sharing one
   * chrome. */
  accentClassName?: string;
  borderClassName?: string;
}

/**
 * Shared chrome for the 3 new "AI Playground" mini-games (Signal Hunt,
 * Neural Path, Data Sort) — consistent card, heading rhythm, and
 * `aria-live` status region, so all four playground experiences (this shell
 * + Train Your AI's own matching idle/playing/finished cards) read as one
 * cohesive interactive chapter rather than unrelated widgets. See
 * CLAUDE.md "do not duplicate animation logic" / reusable component intent.
 */
export function GameFrame({
  eyebrow,
  title,
  description,
  status,
  children,
  controls,
  accentClassName = "text-brand-400",
  borderClassName = "border-white/10",
}: GameFrameProps) {
  return (
    <div className={`flex w-full flex-col items-center gap-6 rounded-3xl border ${borderClassName} bg-white/[0.03] p-6 sm:p-8`}>
      <div className="flex flex-col items-center gap-2 text-center">
        <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${accentClassName}`}>{eyebrow}</p>
        <h3 className="font-display text-2xl font-semibold text-ink-50 sm:text-3xl">{title}</h3>
        <p className="max-w-md text-sm leading-relaxed text-ink-300">{description}</p>
      </div>

      {children}

      <div className="flex flex-wrap items-center justify-center gap-3">{controls}</div>

      <p aria-live="polite" className="sr-only">
        {status}
      </p>
    </div>
  );
}
