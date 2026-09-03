import type { HTMLAttributes, ReactNode } from "react";

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

/** Shared max-width/gutter wrapper used by every section. */
export function Container({ children, className = "", ...rest }: ContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-10 ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}
