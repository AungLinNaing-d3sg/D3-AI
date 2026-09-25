/**
 * Centralized, procedural site-wide audio engine — Tone.js is dynamically
 * imported (only inside `initSiteAudio`, only ever called after a real user
 * gesture) so it never enters the initial JS bundle and never touches the
 * Web Audio API before the browser's autoplay policy allows it to. Every
 * synth/effect node below is constructed exactly once and reused for every
 * subsequent trigger — see `playVoice` — rather than a new Tone.js node per
 * interaction, per the "no duplicate instances" requirement.
 *
 * Kept as a plain singleton module (no React Context) — the same convention
 * this codebase already uses for other truly global, cross-component state
 * (see `lib/motion/journeyState.ts`, and the `useSyncExternalStore`-backed
 * `hooks/useWebglSupported.ts`/`usePrefersReducedMotion.ts`) rather than
 * introducing the app's first Context provider for something that doesn't
 * need per-subtree scoping.
 */

type ToneModule = typeof import("tone");
type Synth = InstanceType<ToneModule["Synth"]>;
type NoiseSynth = InstanceType<ToneModule["NoiseSynth"]>;
type PolySynth = InstanceType<ToneModule["PolySynth"]>;

export type SiteSoundEvent =
  | "hover"
  | "select"
  | "menu-open"
  | "menu-close"
  | "stage-enter"
  | "complete";

interface Voices {
  hoverSynth: NoiseSynth;
  synth: Synth;
  polySynth: PolySynth;
}

const ENABLED_STORAGE_KEY = "d3sg-site-audio-enabled";

/** Minimum gap between repeated triggers of the same event, so a burst of
 * hovers/clicks can't spam the same sound — "meaningful and sparse", not a
 * sound on every mouse movement. */
const THROTTLE_MS: Record<SiteSoundEvent, number> = {
  hover: 140,
  select: 90,
  "menu-open": 150,
  "menu-close": 150,
  "stage-enter": 500,
  complete: 250,
};

let toneModule: ToneModule | null = null;
let voices: Voices | null = null;
let initPromise: Promise<void> | null = null;

let enabled = false;
let hasHydratedEnabled = false;
const lastPlayedAt: Partial<Record<SiteSoundEvent, number>> = {};
const listeners = new Set<() => void>();

function readPersistedEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(ENABLED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function persistEnabled(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ENABLED_STORAGE_KEY, value ? "1" : "0");
  } catch {
    // Private browsing / storage blocked — the preference just won't
    // survive a reload this session; everything else still works.
  }
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

/** `useSyncExternalStore` snapshot — see `hooks/useSiteAudio.ts`. */
export function getSiteAudioEnabled(): boolean {
  if (!hasHydratedEnabled) {
    enabled = readPersistedEnabled();
    hasHydratedEnabled = true;
  }
  return enabled;
}

export function subscribeSiteAudio(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Builds every synth/effect node exactly once. Idempotent and safe to call
 * from multiple places (the sound toggle, and `SiteAudioController`
 * re-unlocking a returning visitor's already-enabled preference) — later
 * calls just await the same in-flight/completed promise.
 *
 * Wrapped in try/catch: if Tone.js or the Web Audio API is unavailable for
 * any reason (locked-down browser, a test environment, exhausted audio
 * contexts), this fails silently — the rest of the site has no dependency on
 * audio ever having initialized.
 */
export function initSiteAudio(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const Tone = await import("tone");
      await Tone.start();

      const master = new Tone.Volume(-14).toDestination();
      const bus = new Tone.Freeverb({ roomSize: 0.22, dampening: 3500, wet: 0.16 }).connect(master);

      const hoverFilter = new Tone.Filter({ type: "highpass", frequency: 5200 }).connect(bus);
      const hoverSynth = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.02 },
        volume: -20,
      }).connect(hoverFilter);

      const synth = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.004, decay: 0.09, sustain: 0, release: 0.06 },
        volume: -10,
      }).connect(bus);

      const polySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sine" },
        envelope: { attack: 0.08, decay: 0.3, sustain: 0.05, release: 0.7 },
        volume: -12,
      }).connect(bus);

      toneModule = Tone;
      voices = { hoverSynth, synth, polySynth };
    } catch {
      toneModule = null;
      voices = null;
    }
  })();

  return initPromise;
}

/** Turns the site-wide audio preference on/off, persists it for the current
 * session, and — only when turning on — lazily initializes the engine (the
 * explicit "Sound On" gesture the browser's autoplay policy requires). */
export function setSiteAudioEnabled(next: boolean): void {
  enabled = next;
  hasHydratedEnabled = true;
  persistEnabled(next);
  notify();
  if (next) void initSiteAudio();
}

function playVoice(event: SiteSoundEvent): void {
  if (!toneModule || !voices) return;
  const now = toneModule.now();

  switch (event) {
    case "hover":
      voices.hoverSynth.triggerAttackRelease("32n", now);
      break;
    case "select":
      voices.synth.triggerAttackRelease("A5", "16n", now);
      break;
    case "menu-open":
      voices.synth.triggerAttackRelease("C5", "32n", now);
      voices.synth.triggerAttackRelease("E5", "32n", now + 0.07);
      break;
    case "menu-close":
      voices.synth.triggerAttackRelease("E5", "32n", now);
      voices.synth.triggerAttackRelease("C5", "32n", now + 0.07);
      break;
    case "stage-enter":
      voices.polySynth.triggerAttackRelease(["C4", "G4"], "8n", now);
      break;
    case "complete":
      voices.polySynth.triggerAttackRelease(["C5", "E5", "G5"], "4n", now);
      break;
  }
}

/**
 * Fire-and-forget entry point every call site uses (see `hooks/useSiteAudio.ts`).
 * No-ops entirely when disabled, not yet initialized (e.g. a returning
 * visitor's preference was restored but they haven't gestured yet this page
 * load), or throttled.
 */
export function playSiteSound(event: SiteSoundEvent): void {
  if (!getSiteAudioEnabled() || !voices) return;

  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const last = lastPlayedAt[event] ?? -Infinity;
  if (now - last < THROTTLE_MS[event]) return;
  lastPlayedAt[event] = now;

  playVoice(event);
}
