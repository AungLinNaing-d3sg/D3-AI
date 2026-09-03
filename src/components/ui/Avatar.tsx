interface AvatarProps {
  initials: string;
  name: string;
  className?: string;
}

/**
 * Gradient initials avatar. The reference design used real staff photos,
 * but no usable photo assets ship with this repo, so we render an
 * accessible, brand-coloured placeholder instead of copying/scraping
 * imagery from the old site's screenshots.
 */
export function Avatar({ initials, name, className = "" }: AvatarProps) {
  return (
    <div
      role="img"
      aria-label={name}
      className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 via-brand-500 to-ink-700 text-xl font-semibold text-white shadow-lg ${className}`}
    >
      {initials}
    </div>
  );
}
