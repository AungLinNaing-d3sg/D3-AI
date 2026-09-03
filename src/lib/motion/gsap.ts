import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

/**
 * Registers GSAP plugins exactly once, client-side only. Importing GSAP is
 * safe on the server, but `ScrollTrigger` touches `window`/`document` as
 * soon as it runs, so registration is guarded and deferred to callers that
 * only ever run inside `useEffect`/client components.
 */
export function ensureGsapRegistered() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

export { gsap, ScrollTrigger };
