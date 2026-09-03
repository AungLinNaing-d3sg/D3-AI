import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  id?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  id,
}: SectionHeadingProps) {
  const alignment = align === "center" ? "items-center text-center mx-auto" : "items-start text-left";

  return (
    <div className={`flex max-w-2xl flex-col gap-4 ${alignment}`}>
      {eyebrow ? (
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-brand-300 uppercase">
          {eyebrow}
        </span>
      ) : null}
      <h2
        id={id}
        className="text-balance text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl"
      >
        {title}
      </h2>
      {description ? (
        <p className="text-balance text-base leading-relaxed text-ink-300 sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
