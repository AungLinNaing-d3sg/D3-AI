import type { ServiceIconName } from "@/types";

interface ServiceIconProps {
  name: ServiceIconName;
  className?: string;
}

/** Minimal, hand-authored line icons for the three service pillars. */
export function ServiceIcon({ name, className = "h-7 w-7" }: ServiceIconProps) {
  const shared = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  if (name === "data") {
    return (
      <svg {...shared}>
        <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
        <path d="M5 5.5v6c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5v-6" />
        <path d="M5 11.5v6c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5v-6" />
      </svg>
    );
  }

  if (name === "dynamics") {
    return (
      <svg {...shared}>
        <circle cx="12" cy="12" r="2" />
        <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(45 12 12)" />
        <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(-45 12 12)" />
      </svg>
    );
  }

  return (
    <svg {...shared}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </svg>
  );
}
