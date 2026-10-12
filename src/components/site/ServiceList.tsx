"use client";

import { useId, useState } from "react";

const MOBILE_VISIBLE = 3;
/** Collapsing a single item saves no space (the toggle is as tall). */
const MIN_HIDDEN = 2;

/**
 * Service bullet list. On small screens only the first few items show, with
 * a toggle for the rest (CSS hides the extras via `data-collapsed`); on wider
 * screens the toggle is hidden and every item is always visible. All items
 * stay in the DOM either way, so nothing is lost to search engines.
 */
export function ServiceList({ items, label }: { items: readonly string[]; label: string }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const hidden = items.length - MOBILE_VISIBLE;
  const collapsible = hidden >= MIN_HIDDEN;

  return (
    <>
      <ul id={id} className="svc-list" aria-label={label} data-collapsed={collapsible && !expanded ? "" : undefined}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {collapsible ? (
        <button type="button" className="svc-more" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : `Show all ${items.length}`}
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>
      ) : null}
    </>
  );
}
