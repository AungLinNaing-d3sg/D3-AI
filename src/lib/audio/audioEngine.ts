/**
 * The site's single audio engine — one Tone.js module, one AudioContext and
 * one master output shared by both audio systems:
 *
 * - A: UI / interaction sounds (lib/audio/audioManager.ts) → `sfx` bus;
 * - B: background music (lib/audio/musicManager.ts) → `music` bus.
 *
 * Each system keeps its own on/off; neither creates its own context or
 * Tone.js instance. Tone.js is dynamically imported only here — from a real user
 * gesture, or once the browser has already let the page's music autoplay —
 * so it never enters the initial bundle and never touches Web Audio before
 * it's allowed.
 */

export type ToneModule = typeof import("tone");

export interface AudioEngine {
  Tone: ToneModule;
  /** Everything ends here: master → destination. */
  master: InstanceType<ToneModule["Volume"]>;
  /** Interaction sounds (system A). */
  sfx: InstanceType<ToneModule["Volume"]>;
  /** Background music (system B) connects its own chain into this. */
  music: InstanceType<ToneModule["Volume"]>;
}

let enginePromise: Promise<AudioEngine | null> | null = null;
let loadedTone: ToneModule | null = null;

/**
 * Loads Tone.js, resumes the AudioContext and builds the master graph —
 * exactly once; later calls share the same promise. Called from a
 * user-activation event (click / tap / key press), or after the browser has
 * let media autoplay (the same policy governs the AudioContext). Resolves `null` if Web
 * Audio is unavailable (locked-down browser, test environment): the site
 * never depends on audio having started.
 */
export function ensureAudioEngine(): Promise<AudioEngine | null> {
  if (enginePromise) return enginePromise;
  enginePromise = (async () => {
    try {
      const Tone = await import("tone");
      loadedTone = Tone;
      await Tone.start();
      // Output safety: a soft clipper on the combined signal, so music and
      // interaction sounds together can never exceed full scale. It is
      // exactly linear below 90% of full scale — a backstop, not a colour.
      // (A Web Audio compressor "limiter" can't do this alone: its attack
      // lets fast transients overshoot, and it adds automatic makeup gain.)
      const safety = new Tone.WaveShaper(softClipCurve(), 4096).toDestination();
      safety.oversample = "2x";
      const master = new Tone.Volume(0).connect(safety);
      const sfx = new Tone.Volume(-14).connect(master);
      const music = new Tone.Volume(0).connect(master);
      return { Tone, master, sfx, music };
    } catch {
      enginePromise = null;
      return null;
    }
  })();
  return enginePromise;
}

/**
 * Resumes the shared AudioContext synchronously, inside the current user
 * activation — so an engine start that was attempted without one (page-load
 * autoplay the browser held back) completes on the listener's first press
 * instead of waiting forever. A no-op before Tone.js has loaded.
 */
export function resumeAudioContextNow(): void {
  if (!loadedTone) return;
  const raw = loadedTone.getContext().rawContext as unknown as AudioContext;
  if (raw.state !== "running") void raw.resume().catch(() => undefined);
}

/** Linear up to 0.9, then easing smoothly into a ceiling of 0.99 — no
 * hard edge, never above full scale. */
export function softClip(x: number): number {
  const knee = 0.9;
  const magnitude = Math.abs(x);
  if (magnitude <= knee) return x;
  const headroom = 0.99 - knee;
  return Math.sign(x) * (knee + headroom * Math.tanh((magnitude - knee) / headroom));
}

function softClipCurve(): Float32Array {
  const size = 4096;
  const curve = new Float32Array(size);
  for (let i = 0; i < size; i += 1) curve[i] = softClip((i / (size - 1)) * 2 - 1);
  return curve;
}
