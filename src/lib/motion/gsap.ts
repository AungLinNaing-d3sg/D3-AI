import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

let registered = false;

/**
 * Registers GSAP plugins exactly once, client-side only. Importing GSAP is
 * safe on the server, but `ScrollTrigger`/`SplitText` touch `window`/
 * `document` as soon as they run, so registration is guarded and deferred to
 * callers that only ever run inside `useEffect`/client components.
 *
 * `SplitText` is GSAP's own official plugin (bundled with the `gsap` package
 * itself — no extra dependency) used by `<Reveal variant="chars" | "words">`
 * (see components/motion/Reveal.tsx) for the character/word-stagger
 * headline animations; it automatically wraps the split text with an
 * `aria-label` on the container and marks the generated spans
 * `aria-hidden="true"`, so screen readers still read the original sentence
 * rather than one word/character at a time.
 */
export function ensureGsapRegistered() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  registered = true;
}

export { gsap, ScrollTrigger, SplitText };
