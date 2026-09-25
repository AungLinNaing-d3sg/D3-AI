"use client";

import { useSiteAudio } from "@/hooks/useSiteAudio";

interface SoundToggleProps {
  className?: string;
}

/**
 * Minimal, premium "Sound On/Off" control — styled to match Header's
 * existing icon-button chrome (same size/border/focus-ring as the mobile
 * hamburger button) so it reads as native nav chrome, not a bolted-on
 * feature. See `hooks/useSiteAudio.ts` for the underlying state; sound
 * defaults off until this is explicitly pressed.
 */
export function SoundToggle({ className = "" }: SoundToggleProps) {
  const { enabled, toggle } = useSiteAudio();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Turn sound off" : "Turn sound on"}
      title={enabled ? "Sound on" : "Sound off"}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-ink-100 transition-colors duration-300 hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 ${className}`.trim()}
    >
      {enabled ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 9v6h4l5 4V5L8 9H4Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.3 8.7a4.6 4.6 0 0 1 0 6.6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.6 6.4a8 8 0 0 1 0 11.2" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 9v6h4l5 4V5L8 9H4Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 9.5l5 5M21 9.5l-5 5" />
        </svg>
      )}
    </button>
  );
}
