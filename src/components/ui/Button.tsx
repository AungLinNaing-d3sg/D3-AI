import type { ButtonHTMLAttributes, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import type { Route } from "next";
import Link from "next/link";
import { handleInPageNavClick } from "@/lib/motion/scrollNav";

type Variant = "primary" | "secondary" | "ghost";

const baseClasses =
  "group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold tracking-wide transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:cursor-not-allowed disabled:opacity-60";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-white shadow-[0_8px_30px_-8px_rgba(241,74,48,0.65)] hover:bg-brand-400 hover:shadow-[0_12px_40px_-8px_rgba(241,74,48,0.75)] active:bg-brand-600",
  secondary:
    "border border-white/15 bg-white/5 text-ink-50 backdrop-blur hover:border-white/30 hover:bg-white/10",
  ghost: "text-ink-100 hover:text-brand-300",
};

interface CommonProps {
  variant?: Variant;
  className?: string;
  children: ReactNode;
}

interface LinkButtonProps extends CommonProps {
  href: Route | `#${string}` | `mailto:${string}` | `tel:${string}`;
  /** Called in addition to (never instead of) the in-page scroll/route
   * navigation this component already handles — e.g. a call site wiring up
   * a UI sound (see `components/layout/Header.tsx`'s "Contact Us" CTA). */
  onClick?: () => void;
  onMouseEnter?: () => void;
}

type NativeButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

function classes(variant: Variant, className: string) {
  return `${baseClasses} ${variantClasses[variant]} ${className}`.trim();
}

function isInPageOrProtocolHref(href: string) {
  return href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:");
}

/**
 * Anchor-flavoured CTA. In-page anchors (`#cta`) and `mailto:`/`tel:`
 * links render as a plain `<a>` (no client-side route transition needed);
 * everything else goes through `next/link`.
 */
export function LinkButton({
  href,
  variant = "primary",
  className = "",
  children,
  onClick,
  onMouseEnter,
}: LinkButtonProps) {
  if (isInPageOrProtocolHref(href)) {
    const isHash = href.startsWith("#");
    // Only ever attach a *real* handler function when there's actually
    // something to do (an in-page scroll, or a caller-supplied callback) —
    // a plain `mailto:`/`tel:` link with neither (e.g. CtaSection's contact
    // links) must get `onClick={undefined}`, exactly like before this
    // component supported an optional `onClick` prop at all. This one stays
    // a fully static anchor renderable from a Server Component; attaching an
    // unconditional inline closure here — even a no-op one — is exactly what
    // trips "Event handlers cannot be passed to Client Component props" for
    // any such Server Component caller.
    const handleClick =
      isHash || onClick
        ? (event: ReactMouseEvent<HTMLAnchorElement>) => {
            onClick?.();
            if (isHash) handleInPageNavClick(event, href);
          }
        : undefined;

    return (
      <a href={href} onClick={handleClick} onMouseEnter={onMouseEnter} className={classes(variant, className)}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href as Route} onClick={onClick} onMouseEnter={onMouseEnter} className={classes(variant, className)}>
      {children}
    </Link>
  );
}

/** Native <button> flavoured CTA — use for form submits/actions. */
export function Button({ variant = "primary", className = "", children, type = "button", ...rest }: NativeButtonProps) {
  return (
    <button type={type} className={classes(variant, className)} {...rest}>
      {children}
    </button>
  );
}
