import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Route } from "next";
import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost";

const baseClasses =
  "group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:cursor-not-allowed disabled:opacity-60";

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
  href: Route | string;
  external?: boolean;
}

type NativeButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

function classes(variant: Variant, className: string) {
  return `${baseClasses} ${variantClasses[variant]} ${className}`.trim();
}

/** Anchor-flavoured CTA — use for navigation (internal or external links). */
export function LinkButton({
  href,
  variant = "primary",
  className = "",
  external = false,
  children,
}: LinkButtonProps) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes(variant, className)}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href as Route} className={classes(variant, className)}>
      {children}
    </Link>
  );
}

/** Native <button> flavoured CTA — use for form submits/actions. */
export function Button({
  variant = "primary",
  className = "",
  children,
  type = "button",
  ...rest
}: NativeButtonProps) {
  return (
    <button type={type} className={classes(variant, className)} {...rest}>
      {children}
    </button>
  );
}
