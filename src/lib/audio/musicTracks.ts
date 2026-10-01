/**
 * The site's soundtrack — the one central track configuration. Five
 * instrumental pieces supplied as MP3s in `public/audio/` (see
 * public/audio/README.md for credits), played in this order — calm piano
 * first, building towards the more cinematic pieces:
 *
 *   01 — Warm Memories        emotional, inspiring piano
 *   02 — Winter               Alex-Productions
 *   03 — Precious Memories    Shane Ivers
 *   04 — Dream Up             Roa
 *   05 — Powerful Emotional Trailer   MaxKoMusic
 *
 * Next.js serves `public/` at the site root, so each `src` is the browser
 * URL — `/audio/…`, never `/public/audio/…`. Which files exist is checked on
 * the server at runtime (app/api/music-sources), so the browser never
 * requests a missing file and a newly added one is picked up without any
 * code change.
 */

export interface MusicTrack {
  /** "01". */
  number: string;
  title: string;
  /** Composer / artist, when known (from the file's tags). */
  artist?: string;
  /** Primary browser URL of the track's audio file. */
  src: string;
  /**
   * Level trim in dB, so every track plays at about the same loudness (≈ -17
   * dBFS RMS) — the supplied files range from ≈ -11.5 to ≈ -18.5 dBFS.
   * Measured per file; update it if a file is replaced.
   */
  gainDb: number;
}

export const MUSIC_TRACKS: readonly MusicTrack[] = [
  { number: "01", title: "Warm Memories", src: "/audio/Warm-Memories-Emotional-Inspiring-Piano.mp3", gainDb: 1.5 },
  { number: "02", title: "Winter", artist: "Alex-Productions", src: "/audio/Winter-Long-Version.mp3", gainDb: 0.9 },
  { number: "03", title: "Precious Memories", artist: "Shane Ivers", src: "/audio/precious-memories.mp3", gainDb: -1.6 },
  { number: "04", title: "Dream Up", artist: "Roa", src: "/audio/Roa-Dream-Up.mp3", gainDb: -4.9 },
  {
    number: "05",
    title: "Powerful Emotional Trailer",
    artist: "MaxKoMusic",
    src: "/audio/Powerful-Emotional-Trailer.mp3",
    gainDb: -5.5,
  },
];

export const TRACK_COUNT = MUSIC_TRACKS.length;

/** Formats accepted in addition to the configured `src`. */
const FALLBACK_EXTENSIONS = ["wav", "mp3", "ogg"] as const;

/** The configured `src` first, then the same file name as .wav/.mp3/.ogg. */
export function sourceCandidates(track: MusicTrack): string[] {
  const base = track.src.replace(/\.[a-z0-9]+$/i, "");
  return [track.src, ...FALLBACK_EXTENSIONS.map((ext) => `${base}.${ext}`)].filter(
    (url, index, all) => all.indexOf(url) === index
  );
}

/**
 * Per-track availability:
 * - `loading` — being checked, or its audio is loading;
 * - `available` — a real file is present (and, once loaded, playable);
 * - `unavailable` — no file has been added;
 * - `error` — a file exists but couldn't be played (not retried).
 */
export type TrackStatus = "loading" | "available" | "unavailable" | "error";

/** Next, wrapping from the last track back to the first. */
export function nextTrackIndex(index: number): number {
  return (index + 1) % TRACK_COUNT;
}

/** Previous, wrapping from the first track to the last. */
export function previousTrackIndex(index: number): number {
  return (index - 1 + TRACK_COUNT) % TRACK_COUNT;
}

/** "01 — WARM MEMORIES". */
export function trackLabel(track: MusicTrack): string {
  return `${track.number} — ${track.title.toUpperCase()}`;
}

/** "1:05". */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
