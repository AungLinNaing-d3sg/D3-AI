import type { ElementType, ReactNode } from "react";

interface ContainerProps {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

/**
 * Consistent max-width/padding wrapper used by every section so page
 * content lines up across the whole site.
 */
export function Container({ as: Tag = "div", className = "", children }: ContainerProps) {
  return (
    <Tag className={`mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-10 ${className}`}>
      {children}
    </Tag>
  );
}
