import type { ServiceIconName } from "@/types";

interface ServiceIconProps {
  name: ServiceIconName;
  className?: string;
}

/**
 * Hand-rolled inline SVG icon set for the three service pillars. Kept as
 * inline SVG (rather than an icon font/library) so there is zero extra
 * dependency weight and the stroke colour can inherit `currentColor`.
 */
export function ServiceIcon({ name, className = "h-7 w-7" }: ServiceIconProps) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "data":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
          <path d="M5 5.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
          <path d="M5 11.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
        </svg>
      );
    case "dynamics":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2.5" />
          <path d="M12 2v3.2M12 18.8V22M4.9 4.9l2.3 2.3M16.8 16.8l2.3 2.3M2 12h3.2M18.8 12H22M4.9 19.1l2.3-2.3M16.8 7.2l2.3-2.3" />
        </svg>
      );
    case "digital":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
          <path d="M7.5 9.5 9.5 11l-2 1.5M13 12.5h3" />
        </svg>
      );
    default:
      return null;
  }
}
