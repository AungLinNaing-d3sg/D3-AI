import {
  ensureAudioEngine,
  resumeAudioContextNow,
  type AudioEngine,
  type ToneModule,
} from "@/lib/audio/audioEngine";
import { MUSIC_TRACKS, nextTrackIndex, previousTrackIndex, TRACK_COUNT, type TrackStatus } from "@/lib/audio/musicTracks";

/**
 * Audio system B — the one global background-music player. A plain module
 * singleton (the codebase's convention for global state, like
 * `journeyState`), so the music survives every section change and is never
 * reloaded, restarted or duplicated by navigation. It shares the site's
 * single Tone.js context (lib/audio/audioEngine.ts) and plays into its own
 * `music` bus — completely separate from the interaction sounds (system A).
 *
 * Tracks are the owner-supplied files in `public/audio/` (see
 * lib/audio/musicTracks.ts), streamed through an <audio> element routed into
 * the audio context — streaming keeps memory low (decoding a whole track
 * into a buffer costs ~85 MB for four minutes) and the element keeps its own
 * playback position, so pausing and turning music off never lose it.
 *
 * Gain staging — each stage has one job and sits at unity unless doing it,
 * so nothing attenuates twice:
 *   track fader (crossfades) → music gain (on/off & play/pause fades, and
 *   the volume slider) → engine music bus → peak limiter → output.
 *
 * Every control is serialised through one queue, so rapid presses can't
 * race each other into overlapping tracks.
 *
 * Playback lifecycle — one explicit phase, so page-load autoplay and the
 * tab-switch pause can never conflict:
 *
 *   "init"     nothing attempted yet.
 *   "autoplay" page load/refresh: the saved (or first) track is started on
 *              its own, if music is on — `play()` is attempted as soon as the
 *              player knows which files exist.
 *   "blocked"  the browser's autoplay policy refused it: nothing sounds and
 *              nothing claims to (the player shows Ready). The refused
 *              element is kept, and Play starts that same element.
 *   "active"   the autoplay phase is over. From here on only the listener's
 *              own controls (Play, Music On, Previous/Next) start sound.
 *
 * `play()` is called from exactly three places: page-load autoplay
 * (`initializeMusic`, once per page load), Play / Music On, and a track
 * change while playing. No interaction, focus, blur, scroll or visibility
 * listener ever starts playback.
 *
 * Leaving the page (another tab or app, minimised — the page becoming
 * hidden) pauses the music in place and ends any autoplay phase
 * (`handleMusicVisibilityChange`); becoming visible again does nothing to
 * playback — the music stays paused until Play, which resumes the same
 * element from its kept position. Track, volume and On/Off are kept.
 */

export interface MusicState {
  isMusicEnabled: boolean;
  /** Index into `MUSIC_TRACKS`. */
  currentTrack: number;
  /** Actually sounding right now. */
  isPlaying: boolean;
  /** 0..1 slider value. */
  volume: number;
  /** Seconds into the current track. */
  currentTime: number;
  /** Length of the current track (0 until known). */
  duration: number;
  /** A crossfade or on/off/play/pause fade is in progress. */
  isTransitioning: boolean;
  /** Per track: loading / available / unavailable / error. */
  status: readonly TrackStatus[];
}

/** Comfortable default: clearly audible, still sitting under the site. */
export const DEFAULT_MUSIC_VOLUME = 0.4;
const STORAGE_KEY = "d3sg-music";
/** Track-to-track crossfade (seconds). */
const CROSSFADE = 1.2;
/** Music On/Off fade (seconds). */
const TOGGLE_FADE = 0.8;
/** Play/Pause fade (seconds). */
const PAUSE_FADE = 0.45;
/** First entrance after a gesture. */
const FIRST_FADE = 1.8;

/**
 * Volume slider (0..1) → dB: a gentle curve (gain = v^1.1), so the middle of
 * the slider is a comfortable level and the top keeps headroom: 40% ≈
 * -8.8 dB, 100% = 0 dB. The limiter downstream means no setting can clip.
 */
export function volumeToDb(volume: number): number {
  if (volume <= 0.001) return -80;
  return 22 * Math.log10(Math.min(volume, 1));
}

const CHECKING: readonly TrackStatus[] = MUSIC_TRACKS.map(() => "loading");

const DEFAULT_STATE: MusicState = {
  isMusicEnabled: true,
  currentTrack: 0,
  isPlaying: false,
  volume: DEFAULT_MUSIC_VOLUME,
  currentTime: 0,
  duration: 0,
  isTransitioning: false,
  status: CHECKING,
};

/* ------------------------------------------------------------------ */
/* State store (useSyncExternalStore) + persistence (localStorage)      */
/* ------------------------------------------------------------------ */

let state: MusicState = DEFAULT_STATE;
let hydrated = false;
const listeners = new Set<() => void>();

/** Validates a persisted preference; anything malformed falls back to the
 * defaults. */
export function parsePersistedMusic(raw: string | null): Pick<MusicState, "isMusicEnabled" | "currentTrack" | "volume"> {
  const fallback = { isMusicEnabled: DEFAULT_STATE.isMusicEnabled, currentTrack: 0, volume: DEFAULT_MUSIC_VOLUME };
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<{ enabled: unknown; track: unknown; volume: unknown }>;
    const track = Number(parsed.track);
    const volume = Number(parsed.volume);
    return {
      isMusicEnabled: typeof parsed.enabled === "boolean" ? parsed.enabled : fallback.isMusicEnabled,
      currentTrack: Number.isInteger(track) && track >= 0 && track < TRACK_COUNT ? track : 0,
      volume: Number.isFinite(volume) && volume >= 0 && volume <= 1 ? volume : DEFAULT_MUSIC_VOLUME,
    };
  } catch {
    return fallback;
  }
}

function persist(): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ enabled: state.isMusicEnabled, track: state.currentTrack, volume: state.volume })
    );
  } catch {
    // Storage blocked — the preference just won't survive a reload.
  }
}

function hydrate(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  state = { ...state, ...parsePersistedMusic(raw) };
}

function setState(patch: Partial<MusicState>, save = false): void {
  state = { ...state, ...patch };
  if (save) persist();
  listeners.forEach((listener) => listener());
}

export function getMusicState(): MusicState {
  hydrate();
  return state;
}

export function getServerMusicState(): MusicState {
  return DEFAULT_STATE;
}

export function subscribeMusic(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* ------------------------------------------------------------------ */
/* Audio graph                                                          */
/* ------------------------------------------------------------------ */

type Node<K extends keyof ToneModule> = ToneModule[K] extends abstract new (...args: never[]) => infer I ? I : never;

interface MusicGraph {
  engine: AudioEngine;
  /** On/off and play/pause fades. */
  gain: Node<"Gain">;
  /** The slider (same stage: fades, then level). */
  volume: Node<"Volume">;
  analyser: Node<"Analyser">;
}

/** One track, streaming. */
interface Deck {
  index: number;
  element: HTMLAudioElement;
  fader: Node<"Gain">;
  dispose: () => void;
}

let sources: readonly (string | null)[] = MUSIC_TRACKS.map(() => null);
let graphPromise: Promise<MusicGraph | null> | null = null;
let graph: MusicGraph | null = null;
let current: Deck | null = null;
/** Outgoing decks still fading out of a crossfade. */
const retiring = new Set<Deck>();
let advancing = false;
/** The listener asked for music (not paused via Play/Pause). */
let userPaused = false;
let started = false;
type Phase = "init" | "autoplay" | "blocked" | "active";
let phase: Phase = "init";
/** The element tried during page-load autoplay, and its track — it becomes
 * the deck (at once if allowed, on Play if refused): never a second one. */
let autoplayElement: HTMLAudioElement | null = null;
let autoplayIndex = -1;
let sourcesKnown = false;
let lifecycleAttached = false;
let pauseTimer: ReturnType<typeof setTimeout> | null = null;

let queue: Promise<unknown> = Promise.resolve();
function enqueue(task: () => Promise<void> | void): Promise<void> {
  const next = queue.then(task).catch(() => undefined);
  queue = next;
  return next;
}

function ensureGraph(): Promise<MusicGraph | null> {
  if (graphPromise) return graphPromise;
  graphPromise = (async () => {
    const engine = await ensureAudioEngine();
    if (!engine) {
      graphPromise = null;
      return null;
    }
    const { Tone } = engine;
    // Zero-attack peak limiter on the music bus: nothing reaches full scale,
    // even at 100% — mastered tracks are never squashed below that.
    const limiter = new Tone.Compressor({ threshold: -1.5, ratio: 20, knee: 0, attack: 0, release: 0.12 }).connect(engine.music);
    const volume = new Tone.Volume(volumeToDb(state.volume)).connect(limiter);
    const gain = new Tone.Gain(0).connect(volume);
    const analyser = new Tone.Analyser("fft", 32);
    gain.connect(analyser);
    graph = { engine, gain, volume, analyser };
    return graph;
  })();
  return graphPromise;
}

function setStatus(index: number, status: TrackStatus): void {
  if (state.status[index] === status) return;
  setState({ status: state.status.map((value, i) => (i === index ? status : value)) });
}

/** Has a file that hasn't failed. */
function isAvailable(index: number): boolean {
  return Boolean(sources[index]) && state.status[index] !== "error" && state.status[index] !== "unavailable";
}

/** The next track in `direction` that has a file (or `from` if none do). */
function stepAvailable(from: number, direction: 1 | -1): number {
  let index = from;
  for (let i = 0; i < TRACK_COUNT; i += 1) {
    index = direction === 1 ? nextTrackIndex(index) : previousTrackIndex(index);
    if (isAvailable(index)) return index;
  }
  return direction === 1 ? nextTrackIndex(from) : previousTrackIndex(from);
}

/** `existing`: an element already started (page-load autoplay) to adopt as
 * this deck's — never a second element for the same track. */
function createDeck(g: MusicGraph, index: number, existing?: HTMLAudioElement): Deck | null {
  const src = sources[index];
  if (!src) return null;
  const { Tone } = g.engine;
  const element = existing ?? new Audio();
  if (!existing) {
    element.preload = "auto";
    element.src = src;
  }
  const raw = g.engine.Tone.getContext().rawContext as unknown as AudioContext;
  const node = raw.createMediaElementSource(element);
  const fader = new Tone.Gain(0).connect(g.gain);
  // Per-track loudness trim (musicTracks.ts), fixed for the deck's lifetime.
  const trim = new Tone.Gain(MUSIC_TRACKS[index]?.gainDb ?? 0, "decibels").connect(fader);
  Tone.connect(node, trim);

  const onTime = () => {
    if (current?.element !== element) return;
    const duration = Number.isFinite(element.duration) ? element.duration : 0;
    setState({ currentTime: element.currentTime, duration });
    // Natural progression: crossfade into the next track just before the end.
    if (duration > 0 && duration - element.currentTime <= CROSSFADE + 0.25 && !advancing) {
      advancing = true;
      void enqueue(() => switchTrack(stepAvailable(index, 1), CROSSFADE));
    }
  };
  const onEnded = () => {
    if (current?.element === element && !advancing) {
      advancing = true;
      void enqueue(() => switchTrack(stepAvailable(index, 1), 0.3));
    }
  };
  const onReady = () => setStatus(index, "available");
  // Paused by something other than the player (the OS, a headset button,
  // the browser) — reflect it truthfully and stay paused until Play.
  const onPause = () => {
    if (current?.element !== element || !state.isPlaying || element.ended) return;
    userPaused = true;
    setState({ isPlaying: false, isTransitioning: false, currentTime: element.currentTime });
  };
  // A file that exists but can't be played (corrupt, unsupported): mark it
  // and move on — never retried, and no error surfaced to the console.
  const onError = () => {
    setStatus(index, "error");
    if (current?.element !== element) return;
    const wasPlaying = state.isPlaying;
    setState({ isPlaying: false, currentTime: 0, duration: 0 });
    if (wasPlaying && !advancing && state.status.some((_, i) => isAvailable(i))) {
      advancing = true;
      void enqueue(() => switchTrack(stepAvailable(index, 1), 0.3));
    }
  };
  element.addEventListener("timeupdate", onTime);
  element.addEventListener("loadedmetadata", onTime);
  element.addEventListener("ended", onEnded);
  element.addEventListener("canplay", onReady);
  element.addEventListener("error", onError);
  element.addEventListener("pause", onPause);
  // An adopted element may already have its data (its `canplay` has fired).
  setStatus(index, element.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA ? "available" : "loading");

  return {
    index,
    element,
    fader,
    dispose: () => {
      element.removeEventListener("timeupdate", onTime);
      element.removeEventListener("loadedmetadata", onTime);
      element.removeEventListener("ended", onEnded);
      element.removeEventListener("canplay", onReady);
      element.removeEventListener("error", onError);
      element.removeEventListener("pause", onPause);
      element.pause();
      element.removeAttribute("src");
      element.load();
      node.disconnect();
      trim.dispose();
      fader.dispose();
      if (state.status[index] === "loading") setStatus(index, "available");
    },
  };
}

/** Starts a deck's element; a refused play (no user activation yet) just
 * waits for the next gesture — never an unhandled rejection. */
async function playElement(element: HTMLAudioElement): Promise<boolean> {
  // Never from a hidden page: coming back must not start sound.
  if (isPageHidden()) return false;
  try {
    await element.play();
    return true;
  } catch {
    return false;
  }
}

function retire(deck: Deck, fade: number): void {
  retiring.add(deck);
  deck.fader.gain.rampTo(0, fade);
  setTimeout(() => {
    if (!retiring.delete(deck)) return; // Already cut short (page hidden).
    deck.dispose();
    setState({ isTransitioning: false });
  }, fade * 1000 + 150);
}

/** Sound is wanted right now: on, not paused, and the page is on screen. */
function wantsSound(): boolean {
  return state.isMusicEnabled && !userPaused && !isPageHidden();
}

function isPageHidden(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

/** Crossfades to `index` (or just selects it, silently, when music is
 * off/paused or not yet started). */
async function switchTrack(index: number, fade: number): Promise<void> {
  setState({ currentTrack: index, currentTime: 0, duration: 0 }, true);
  const g = graph;
  if (!g || !started || !wantsSound()) {
    // Drop the paused track, so playback later starts the chosen one.
    if (current) {
      current.dispose();
      current = null;
    }
    advancing = false;
    return;
  }
  const deck = createDeck(g, index);
  const previous = current;
  current = deck;
  if (previous) {
    setState({ isTransitioning: true });
    retire(previous, fade);
  }
  advancing = false;
  if (!deck) {
    setState({ isPlaying: false });
    return;
  }
  if (!(await playElement(deck.element))) return;
  // Paused or hidden while play() was pending: stay silent, keep the deck.
  if (current !== deck || !wantsSound()) {
    if (current === deck) deck.element.pause();
    return;
  }
  deck.fader.gain.rampTo(1, fade);
  setState({ isPlaying: true });
}

/** Starts or resumes sound — only ever from the listener's own action
 * (Play, Music On, Previous/Next) or the first press after a blocked
 * autoplay. Ends the autoplay phase. */
async function resume(fade: number): Promise<void> {
  const refused = takeAutoplayElement();
  endAutoplayPhase();
  if (!current && !MUSIC_TRACKS.some((_, i) => isAvailable(i))) {
    setState({ isPlaying: false });
    return;
  }
  const g = await ensureGraph();
  if (!g || !wantsSound()) return;
  // The browser may have suspended the context while the page was away.
  const context = g.engine.Tone.getContext();
  if (context.state !== "running") {
    try {
      await context.resume();
    } catch {
      return;
    }
  }
  if (pauseTimer) {
    clearTimeout(pauseTimer);
    pauseTimer = null;
  }
  started = true;
  if (!current) {
    const index = isAvailable(state.currentTrack) ? state.currentTrack : stepAvailable(state.currentTrack, 1);
    if (!isAvailable(index)) {
      setState({ isPlaying: false });
      return;
    }
    if (index !== state.currentTrack) setState({ currentTrack: index }, true);
    // A refused page-load element for this track is reused, not replaced.
    const adopt = refused && refused.index === index ? refused.element : undefined;
    if (refused && !adopt) discardElement(refused.element);
    if (adopt) adopt.volume = 1;
    current = createDeck(g, index, adopt);
    if (!current) return;
    current.fader.gain.rampTo(1, 0.05);
  }
  const deck = current;
  if (!(await playElement(deck.element))) return;
  if (current !== deck || !wantsSound()) {
    if (current === deck) deck.element.pause();
    return;
  }
  setState({ isTransitioning: true, isPlaying: true });
  g.gain.gain.rampTo(1, fade);
  setTimeout(() => setState({ isTransitioning: false }), fade * 1000);
}

/** Fades out and pauses in place — the element keeps its position. */
function fadeAndPause(fade: number): void {
  const g = graph;
  setState({ isPlaying: false });
  if (!g || !current) return;
  setState({ isTransitioning: true });
  g.gain.gain.rampTo(0, fade);
  if (pauseTimer) clearTimeout(pauseTimer);
  const deck = current;
  pauseTimer = setTimeout(() => {
    pauseTimer = null;
    if (!state.isPlaying) deck.element.pause();
    setState({ isTransitioning: false });
  }, fade * 1000 + 50);
}

/* ------------------------------------------------------------------ */
/* Public controls                                                      */
/* ------------------------------------------------------------------ */

/** Server-resolved file URLs (null = missing) — see lib/audio/musicSources.ts.
 * Knowing them is the cue for page-load autoplay. */
export function configureMusicSources(next: readonly (string | null)[]): void {
  sources = next;
  sourcesKnown = true;
  setState({ status: next.map((src) => (src ? "available" : "unavailable")) });
  maybeAutoplay();
}

/* ------------------------------------------------------------------ */
/* Page-load autoplay                                                   */
/* ------------------------------------------------------------------ */

/** Once per page load, when the player is mounted and the files are known. */
function maybeAutoplay(): void {
  if (phase !== "init" || !lifecycleAttached || !sourcesKnown) return;
  hydrate();
  if (!state.isMusicEnabled || isPageHidden()) {
    // Off by choice, or opened in a background tab: no autoplay this load.
    phase = "active";
    return;
  }
  phase = "autoplay";
  void enqueue(autoplay);
}

/** No more automatic starts this page load. */
function endAutoplayPhase(): void {
  phase = "active";
  if (autoplayElement) {
    discardElement(autoplayElement);
    autoplayElement = null;
  }
}

/** Hands over the refused page-load element (if any), so Play can start it. */
function takeAutoplayElement(): { element: HTMLAudioElement; index: number } | null {
  if (!autoplayElement || phase !== "blocked") return null;
  const taken = { element: autoplayElement, index: autoplayIndex };
  autoplayElement = null;
  return taken;
}

function discardElement(element: HTMLAudioElement): void {
  element.pause();
  element.removeAttribute("src");
  element.load();
}

/**
 * Starts the saved (or first) track on page load. The element is tried on
 * its own first, silently (volume 0): the browser's answer to `play()` says
 * whether sound may autoplay, before any AudioContext is created — so a
 * refusal costs nothing and logs nothing. Allowed: the same element is
 * routed into the audio graph and faded in. Refused: "blocked".
 */
async function autoplay(): Promise<void> {
  if (phase !== "autoplay") return;
  const index = isAvailable(state.currentTrack) ? state.currentTrack : stepAvailable(state.currentTrack, 1);
  const src = sources[index];
  if (!src || !isAvailable(index)) {
    phase = "active";
    return;
  }
  if (index !== state.currentTrack) setState({ currentTrack: index }, true);
  const element = new Audio();
  element.preload = "auto";
  element.src = src;
  element.volume = 0;
  autoplayElement = element;
  autoplayIndex = index;
  let allowed = true;
  try {
    await element.play();
  } catch {
    allowed = false;
  }
  // Superseded meanwhile (page hidden, or the listener pressed a control).
  if (phase !== "autoplay" || autoplayElement !== element) return;
  if (!allowed) return blockAutoplay();

  const g = await ensureGraphWithin(2500);
  if (phase !== "autoplay" || autoplayElement !== element) return;
  const context = g?.engine.Tone.getContext();
  if (!g || context?.state !== "running" || !wantsSound()) return blockAutoplay();

  autoplayElement = null;
  phase = "active";
  started = true;
  const deck = createDeck(g, index, element);
  if (!deck) return discardElement(element);
  current = deck;
  element.volume = 1;
  deck.fader.gain.rampTo(1, 0.05);
  setState({ isTransitioning: true, isPlaying: true });
  g.gain.gain.rampTo(1, FIRST_FADE);
  setTimeout(() => setState({ isTransitioning: false }), FIRST_FADE * 1000);
}

/** The browser held autoplay back: nothing plays and nothing claims to.
 * The element is kept (paused) for Play — no listener is added to start it
 * on some later interaction. */
function blockAutoplay(): void {
  autoplayElement?.pause();
  phase = "blocked";
  setState({ isPlaying: false, currentTime: 0 });
}

function ensureGraphWithin(ms: number): Promise<MusicGraph | null> {
  return Promise.race([ensureGraph(), new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

/** Music On/Off — fades, and pauses in place (never restarts). */
export function setMusicEnabled(enabled: boolean): Promise<void> {
  resumeAudioContextNow();
  if (!enabled) endAutoplayPhase();
  setState({ isMusicEnabled: enabled }, true);
  if (enabled) userPaused = false;
  return enqueue(() => (enabled ? resume(TOGGLE_FADE) : fadeAndPause(TOGGLE_FADE)));
}

export function toggleMusic(): Promise<void> {
  return setMusicEnabled(!getMusicState().isMusicEnabled);
}

/** Play/Pause — a pause in place; the saved On/Off preference is kept.
 * Playing while music is off turns it on. */
export function toggleMusicPlayback(): Promise<void> {
  resumeAudioContextNow();
  if (!getMusicState().isMusicEnabled) return setMusicEnabled(true);
  if (state.isPlaying) {
    userPaused = true;
    endAutoplayPhase();
    return enqueue(() => fadeAndPause(PAUSE_FADE));
  }
  userPaused = false;
  return enqueue(() => resume(started ? PAUSE_FADE : FIRST_FADE));
}

/**
 * Previous/Next step to the adjacent track — always, so the track list can
 * be browsed even when files are missing. While music is actually playing,
 * a missing track is skipped over to the next one with a file instead of
 * cutting to silence.
 */
function stepFor(direction: 1 | -1): number {
  const adjacent = direction === 1 ? nextTrackIndex(state.currentTrack) : previousTrackIndex(state.currentTrack);
  if (!state.isPlaying || isAvailable(adjacent)) return adjacent;
  return stepAvailable(state.currentTrack, direction);
}

export function nextTrack(): Promise<void> {
  return enqueue(async () => {
    const index = stepFor(1);
    if (!started && state.isMusicEnabled && !userPaused) {
      setState({ currentTrack: index }, true);
      // Only start audio when the chosen track can actually play.
      if (isAvailable(index)) return resume(FIRST_FADE);
      return;
    }
    return switchTrack(index, CROSSFADE);
  });
}

export function previousTrack(): Promise<void> {
  return enqueue(async () => {
    const index = stepFor(-1);
    if (!started && state.isMusicEnabled && !userPaused) {
      setState({ currentTrack: index }, true);
      // Only start audio when the chosen track can actually play.
      if (isAvailable(index)) return resume(FIRST_FADE);
      return;
    }
    return switchTrack(index, CROSSFADE);
  });
}

export function setMusicVolume(volume: number): void {
  const clamped = Math.min(1, Math.max(0, volume));
  setState({ volume: clamped }, true);
  // A short ramp: follows a slider drag closely without zipper noise.
  if (graph) graph.volume.volume.rampTo(volumeToDb(clamped), 0.12);
}

/**
 * Fills `out` with 0..1 levels of a few frequency bands of the music as it
 * sounds, for the player's visualizer. Returns false when nothing plays.
 */
export function readMusicLevels(out: Float32Array): boolean {
  if (!graph || !state.isPlaying) return false;
  const values = graph.analyser.getValue() as Float32Array;
  const bins = [1, 3, 6, 10, 15];
  for (let i = 0; i < out.length; i += 1) {
    const db = values[bins[i % bins.length]!] ?? -Infinity;
    out[i] = Number.isFinite(db) ? Math.min(1, Math.max(0, (db + 100) / 55)) : 0;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Autoplay policy, tab switching                                       */
/* ------------------------------------------------------------------ */

/**
 * The page is going away from the screen (another tab or app, minimised,
 * locked, or navigating away): pause right now, in place. Hidden pages get
 * their timers throttled, so this can't wait for a fade — it pauses
 * immediately, cuts any crossfade short (the outgoing track is dropped, the
 * incoming one kept and paused), and marks the music paused so neither the
 * return to the page nor a later click resumes it: only Play does. The
 * track, position, volume and On/Off preference are untouched.
 */
function pauseForHiddenPage(): void {
  // Any autoplay still pending or waiting for a press is over.
  const wasAutoplaying = phase === "autoplay" || phase === "blocked";
  endAutoplayPhase();
  const sounding = Boolean(current && !current.element.paused) || [...retiring].some((deck) => !deck.element.paused);
  if (!sounding && !state.isPlaying && !state.isTransitioning && !wasAutoplaying) return;
  userPaused = true;
  advancing = false;
  if (pauseTimer) {
    clearTimeout(pauseTimer);
    pauseTimer = null;
  }
  retiring.forEach((deck) => deck.dispose());
  retiring.clear();
  if (current) {
    current.element.pause();
    current.fader.gain.cancelScheduledValues(0);
    current.fader.gain.value = 1;
  }
  if (graph) {
    graph.gain.gain.cancelScheduledValues(0);
    graph.gain.gain.value = 0;
  }
  setState({
    isPlaying: false,
    isTransitioning: false,
    currentTime: current ? current.element.currentTime : state.currentTime,
  });
}

/** Hidden → pause in place. Visible → nothing at all: playback is left
 * exactly as it is (paused) until the listener presses Play. */
function handleMusicVisibilityChange(): void {
  if (document.visibilityState === "hidden") pauseForHiddenPage();
}

/**
 * The one global lifecycle, mounted by the player (once — a remount or a
 * second caller gets a no-op): page-load autoplay as soon as the files are
 * known, and the pause whenever the page is hidden. Returns a detach.
 */
export function initializeMusic(): () => void {
  if (typeof document === "undefined" || lifecycleAttached) return () => undefined;
  lifecycleAttached = true;
  claimGlobalInstance();
  maybeAutoplay();
  // One listener each, for the whole site. `pagehide` covers leaving the
  // page (and the back/forward cache) where `visibilitychange` may not fire.
  document.addEventListener("visibilitychange", handleMusicVisibilityChange);
  window.addEventListener("pagehide", pauseForHiddenPage);
  return () => {
    lifecycleAttached = false;
    document.removeEventListener("visibilitychange", handleMusicVisibilityChange);
    window.removeEventListener("pagehide", pauseForHiddenPage);
  };
}

/**
 * Exactly one music manager per page. If this module is evaluated again
 * (a development hot reload, or a duplicated bundle), the previous copy is
 * shut down first — its audio stopped and its listeners removed — so an
 * orphaned element can never keep playing, or start again, unseen.
 */
const GLOBAL_KEY = "__d3sgMusicManager";
type GlobalHandle = { shutdown: () => void };

function shutdown(): void {
  lifecycleAttached = false;
  document.removeEventListener("visibilitychange", handleMusicVisibilityChange);
  window.removeEventListener("pagehide", pauseForHiddenPage);
  endAutoplayPhase();
  retiring.forEach((deck) => deck.dispose());
  retiring.clear();
  current?.dispose();
  current = null;
}

function claimGlobalInstance(): void {
  const scope = window as unknown as Record<string, GlobalHandle | undefined>;
  const previous = scope[GLOBAL_KEY];
  if (previous && previous.shutdown !== shutdown) previous.shutdown();
  scope[GLOBAL_KEY] = { shutdown };
}
