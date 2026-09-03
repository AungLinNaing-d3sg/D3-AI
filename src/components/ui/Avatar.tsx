interface AvatarProps {
  initials: string;
  className?: string;
}

/** Initials avatar — used until/unless real headshots are supplied. */
export function Avatar({ initials, className = "" }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-16 w-16 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 font-display text-lg font-semibold text-white shadow-[0_8px_30px_-10px_rgba(241,74,48,0.7)] ${className}`.trim()}
    >
      {initials}
    </span>
  );
}
