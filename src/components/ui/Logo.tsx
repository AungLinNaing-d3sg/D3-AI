import Link from "next/link";

interface LogoProps {
  className?: string;
}

/**
 * Brand wordmark rendered as markup (no image asset). Keeps the header
 * lightweight/crisp at any resolution and avoids depending on a logo
 * file that isn't part of this repo.
 */
export function Logo({ className = "" }: LogoProps) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight text-ink-50 ${className}`}
      aria-label="D3-SG home"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-base font-bold text-white shadow-[0_4px_20px_-4px_rgba(241,74,48,0.7)] transition-transform duration-300 group-hover:scale-105">
        D3
      </span>
      <span>
        SG<span className="text-brand-400">.</span>
      </span>
    </Link>
  );
}
