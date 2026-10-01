"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useMusic } from "@/hooks/useMusic";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { configureMusicSources, initializeMusic, readMusicLevels } from "@/lib/audio/musicManager";
import { formatTime, MUSIC_TRACKS, trackLabel, type MusicTrack, type TrackStatus } from "@/lib/audio/musicTracks";

const BAR_COUNT = 4;

/**
 * Four hairline bars that move gently with the music's real frequency
 * content (the music bus's analyser), written straight to the DOM — no
 * React render per frame, and the loop only runs while music is playing.
 * Static when paused/off/unavailable and under reduced motion.
 */
function Visualizer({ active }: { active: boolean }) {
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const bars = barsRef.current;
    const rest = () => bars.forEach((bar, i) => bar?.style.setProperty("--level", String(0.3 + (i % 2) * 0.16)));
    if (!active || prefersReducedMotion) {
      rest();
      return;
    }
    const levels = new Float32Array(BAR_COUNT);
    const smooth = new Float32Array(BAR_COUNT);
    let frame = 0;
    const tick = () => {
      if (readMusicLevels(levels)) {
        for (let i = 0; i < BAR_COUNT; i += 1) {
          smooth[i] = smooth[i]! + ((levels[i] ?? 0) - smooth[i]!) * 0.2;
          bars[i]?.style.setProperty("--level", (0.2 + smooth[i]! * 0.8).toFixed(3));
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      rest();
    };
  }, [active, prefersReducedMotion]);

  return (
    <span aria-hidden="true" className="music-bars" data-active={active}>
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <span
          key={i}
          ref={(node) => {
            barsRef.current[i] = node;
          }}
          className="music-bar"
        />
      ))}
    </span>
  );
}

/** Marquee speed — slow and even, whatever the title's length. */
const MARQUEE_PX_PER_SECOND = 22;
/** Space between the title and its repeat in the loop (px). */
const MARQUEE_GAP = 40;

/**
 * "01 — WARM MEMORIES" in a fixed-width slot that never grows the player.
 * A title that fits sits still; one that doesn't scrolls slowly right to
 * left, looping seamlessly (the title followed by a copy, moved by exactly
 * one title + gap), with soft fades at both edges. CSS does the motion;
 * a ResizeObserver only decides whether it's needed (fonts, resizes).
 * Runs only while music plays; reduced motion gets a static ellipsis.
 */
function TrackName({ track, moving }: { track: MusicTrack; moving: boolean }) {
  const slotRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    const text = textRef.current;
    if (!slot || !text) return;
    const measure = () => {
      const overflow = text.scrollWidth - slot.clientWidth;
      setDistance(overflow > 1 ? text.scrollWidth + MARQUEE_GAP : 0);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(slot);
    observer.observe(text);
    return () => observer.disconnect();
  }, [track.src]);

  const overflowing = distance > 0;
  const content = (
    <>
      <span className="music-track-number">{track.number}</span>
      <span className="music-track-dash"> — </span>
      <span className="music-track-title">{track.title.toUpperCase()}</span>
    </>
  );

  return (
    <span ref={slotRef} className="music-track" data-overflow={overflowing} data-moving={overflowing && moving}>
      <span key={track.src} className="music-track-text">
        <span
          className="music-track-strip"
          style={
          overflowing
            ? ({
                "--marquee-distance": `${distance}px`,
                "--marquee-duration": `${(distance / MARQUEE_PX_PER_SECOND).toFixed(2)}s`,
                "--marquee-gap": `${MARQUEE_GAP}px`,
              } as CSSProperties)
            : undefined
        }
        >
          <span ref={textRef} className="music-track-item">
            {content}
          </span>
          {overflowing ? (
            <span className="music-track-item music-track-repeat" aria-hidden="true">
              {content}
            </span>
          ) : null}
        </span>
      </span>
    </span>
  );
}

type IconName = "note" | "previous" | "next" | "play" | "pause" | "volume" | "muted";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    note: "M9 17.5V6.5l9-2v9.5M9 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm9-3.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z",
    previous: "M15 6 9 12l6 6M7 6v12",
    next: "M9 6l6 6-6 6M17 6v12",
    play: "M8 5.5v13l10.5-6.5L8 5.5Z",
    pause: "M8.5 5.5v13M15.5 5.5v13",
    volume: "M4 9.5v5h3.5L12 18V6L7.5 9.5H4Zm11.5-.5a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11",
    muted: "M4 9.5v5h3.5L12 18V6L7.5 9.5H4Zm11.5 0 5 5m0-5-5 5",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="music-icon">
      <path d={paths[name]} />
    </svg>
  );
}

/** A short, quiet label for a track that can't play right now. */
const STATUS_TAG: Partial<Record<TrackStatus, string>> = {
  loading: "Loading",
  unavailable: "Unavailable",
  error: "Couldn't play",
};

/** How long an inline change note ("01 → 02", "Music off") stays up. */
const FLASH_MS = 1600;

/** Asks the server once which soundtrack files exist (lib/audio/musicSources.ts). */
function useMusicSources(): void {
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/music-sources", { signal: controller.signal, cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { sources?: unknown } | null) => {
        const list = Array.isArray(body?.sources) ? body.sources : [];
        configureMusicSources(MUSIC_TRACKS.map((_, i) => (typeof list[i] === "string" ? (list[i] as string) : null)));
      })
      .catch(() => {
        if (!controller.signal.aborted) configureMusicSources(MUSIC_TRACKS.map(() => null));
      });
    return () => controller.abort();
  }, []);
}

/**
 * A brief inline note for a change the listener made (or an automatic
 * track change while playing): "01 → 02", "Music off". Never shown for the
 * saved selection being restored on load.
 */
function useChangeNote(currentTrack: number, isPlaying: boolean) {
  const [note, setNote] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousTrack = useRef(currentTrack);
  const stepRequested = useRef(false);

  const show = useCallback((text: string) => {
    setNote(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNote(null), FLASH_MS);
  }, []);

  useEffect(() => {
    const from = previousTrack.current;
    previousTrack.current = currentTrack;
    if (from === currentTrack) return;
    if (stepRequested.current || isPlaying) {
      show(`${MUSIC_TRACKS[from]?.number ?? ""} → ${MUSIC_TRACKS[currentTrack]?.number ?? ""}`);
    }
    stepRequested.current = false;
  }, [currentTrack, isPlaying, show]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return {
    note,
    show,
    expectStep: () => {
      stepRequested.current = true;
    },
  };
}

/**
 * The persistent background-music player (audio system B —
 * lib/audio/musicManager.ts): one instance for the whole site, mounted once
 * in the root layout, anchored just below the header's right edge on
 * tablet/desktop and docked into the end of the mobile progress bar on
 * phones.
 *
 * One compact bar whose controls all act directly — no popups, dialogs or
 * confirmations: the track and its state, Previous / Play-Pause / Next, and
 * a volume button that widens the same bar in place to show the volume
 * slider, time and Music On/Off. Changes are acknowledged by a brief inline
 * note ("01 → 02", "Music off"). A track whose file hasn't been added is
 * shown as unavailable — quietly, with Play disabled — and is never
 * requested; nothing claims to play that isn't playing. The controls never
 * play interaction sounds.
 */
export function MusicPlayer() {
  const music = useMusic();
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const settingsId = useId();
  const track = MUSIC_TRACKS[music.currentTrack] ?? MUSIC_TRACKS[0]!;
  const label = trackLabel(track);
  const trackStatus = music.status[music.currentTrack] ?? "loading";
  const canPlay = trackStatus === "available" || (trackStatus === "loading" && music.isPlaying);
  const hasAudio = trackStatus === "available" && music.duration > 0;
  const percent = Math.round(music.volume * 100);
  const progress = hasAudio ? Math.min(1, music.currentTime / music.duration) : 0;
  const tag = STATUS_TAG[trackStatus];
  const checking = music.status.every((value) => value === "loading") && !music.isPlaying;
  const status = checking
    ? "Checking"
    : tag && !music.isPlaying
      ? tag
      : !music.isMusicEnabled
        ? "Music off"
        : music.isPlaying
          ? "Playing"
          : music.currentTime > 0
            ? "Paused"
            : "Ready";
  const { note, show, expectStep } = useChangeNote(music.currentTrack, music.isPlaying);
  const silent = !music.isMusicEnabled || percent === 0;

  useMusicSources();
  useEffect(() => initializeMusic(), []);

  useEffect(() => {
    if (!expanded) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setExpanded(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setExpanded(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  return (
    <div
      ref={rootRef}
      data-music-control
      className="music-player"
      data-expanded={expanded}
      data-playing={music.isPlaying}
      data-status={trackStatus}
    >
      <div role="group" aria-label={`Music player: ${label}, ${status.toLowerCase()}`} className="music-shell">
        <span className="music-badge" aria-hidden="true">
          {music.isPlaying ? <Visualizer active /> : <Icon name="note" />}
        </span>

        <span className="music-meta">
          <TrackName track={track} moving={music.isPlaying} />
          <span className="music-status" data-note={note ? "true" : "false"} aria-hidden="true">
            {note ?? status}
          </span>
        </span>

        <button
          type="button"
          onClick={() => {
            expectStep();
            music.previous();
          }}
          className="music-button"
          aria-label="Previous track"
        >
          <Icon name="previous" />
        </button>
        <button
          type="button"
          onClick={music.togglePlayback}
          disabled={!canPlay && !music.isPlaying}
          className="music-button music-button-primary"
          aria-label={music.isPlaying ? "Pause music" : "Play music"}
        >
          <Icon name={music.isPlaying ? "pause" : "play"} />
        </button>
        <button
          type="button"
          onClick={() => {
            expectStep();
            music.next();
          }}
          className="music-button"
          aria-label="Next track"
        >
          <Icon name="next" />
        </button>

        <div id={settingsId} role="group" aria-label="Volume and music" className="music-settings" inert={!expanded}>
          <div className="music-settings-inner">
            <label className="music-volume">
              <span className="sr-only">Music volume</span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={percent}
                aria-label="Music volume"
                aria-valuetext={`${percent}%`}
                onChange={(event) => music.setVolume(Number(event.target.value) / 100)}
                className="music-volume-range"
                style={{ "--fill": `${percent}%` } as CSSProperties}
              />
              <output className="music-volume-output" aria-hidden="true">
                {percent}%
              </output>
            </label>

            {hasAudio ? (
              <span className="music-time">
                <span className="sr-only">Played </span>
                {formatTime(music.currentTime)}
                <span aria-hidden="true"> / </span>
                <span className="sr-only"> of </span>
                {formatTime(music.duration)}
              </span>
            ) : null}

            <button
              type="button"
              role="switch"
              aria-checked={music.isMusicEnabled}
              aria-label={`Music ${music.isMusicEnabled ? "on" : "off"}`}
              onClick={() => {
                show(music.isMusicEnabled ? "Music off" : "Music on");
                music.toggle();
              }}
              className="music-switch"
            >
              <span className="music-switch-track" aria-hidden="true">
                <span className="music-switch-thumb" />
              </span>
              <span className="music-switch-label" aria-hidden="true">
                Music {music.isMusicEnabled ? "on" : "off"}
              </span>
            </button>
          </div>
        </div>

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={settingsId}
          aria-label={`${expanded ? "Hide" : "Show"} volume and music on/off`}
          className="music-button"
          data-active={expanded}
        >
          <Icon name={silent ? "muted" : "volume"} />
        </button>

        {hasAudio ? (
          <span className="music-line" aria-hidden="true">
            <span className="music-line-fill" style={{ "--progress": progress } as CSSProperties} />
          </span>
        ) : null}
      </div>

      {/* Phones hide the track name; the same note appears as a small tag above the bar. */}
      <span className="music-note" data-visible={note ? "true" : "false"} aria-hidden="true">
        {note ? (note.includes("→") ? `${note} · ${track.title.toUpperCase()}` : note) : null}
      </span>

      <p className="sr-only" aria-live="polite">
        {`${label}. ${note && note.startsWith("Music") ? note : status}.`}
      </p>
    </div>
  );
}
