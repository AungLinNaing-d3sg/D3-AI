import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MusicPlayer } from "@/components/music/MusicPlayer";
import { DEFAULT_MUSIC_VOLUME, parsePersistedMusic, volumeToDb } from "@/lib/audio/musicManager";
import { resolveMusicSources } from "@/lib/audio/musicSources";
import {
  formatTime,
  MUSIC_TRACKS,
  nextTrackIndex,
  previousTrackIndex,
  sourceCandidates,
  trackLabel,
} from "@/lib/audio/musicTracks";

describe("soundtrack", () => {
  it("is the five supplied tracks, in order", () => {
    expect(MUSIC_TRACKS.map(trackLabel)).toEqual([
      "01 — WARM MEMORIES",
      "02 — WINTER",
      "03 — PRECIOUS MEMORIES",
      "04 — DREAM UP",
      "05 — POWERFUL EMOTIONAL TRAILER",
    ]);
  });

  it("cycles Next through all five and wraps; Previous in reverse", () => {
    expect([0, 1, 2, 3, 4].map(nextTrackIndex)).toEqual([1, 2, 3, 4, 0]);
    expect([0, 4, 3, 2, 1].map(previousTrackIndex)).toEqual([4, 3, 2, 1, 0]);
  });

  it("uses browser paths under /audio/ (never /public/…), with same-name fallbacks", () => {
    expect(MUSIC_TRACKS.map((track) => track.src)).toEqual([
      "/audio/Warm-Memories-Emotional-Inspiring-Piano.mp3",
      "/audio/Winter-Long-Version.mp3",
      "/audio/precious-memories.mp3",
      "/audio/Roa-Dream-Up.mp3",
      "/audio/Powerful-Emotional-Trailer.mp3",
    ]);
    expect(sourceCandidates(MUSIC_TRACKS[3]!)).toEqual([
      "/audio/Roa-Dream-Up.mp3",
      "/audio/Roa-Dream-Up.wav",
      "/audio/Roa-Dream-Up.ogg",
    ]);
  });

  it("evens out loudness with a modest per-track trim", () => {
    for (const track of MUSIC_TRACKS) expect(Math.abs(track.gainDb)).toBeLessThanOrEqual(6);
  });

  it("formats track times", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65.4)).toBe("1:05");
    expect(formatTime(Number.NaN)).toBe("0:00");
  });
});

describe("audio files", () => {
  let publicDir: string;
  beforeEach(() => {
    publicDir = mkdtempSync(path.join(tmpdir(), "d3sg-audio-"));
  });
  afterEach(() => rmSync(publicDir, { recursive: true, force: true }));

  it("only offers files that exist, so the browser never requests a missing one", () => {
    expect(resolveMusicSources(publicDir)).toEqual([null, null, null, null, null]);
    mkdirSync(path.join(publicDir, "audio"));
    writeFileSync(path.join(publicDir, "audio", "Winter-Long-Version.mp3"), "");
    writeFileSync(path.join(publicDir, "audio", "Roa-Dream-Up.ogg"), "");
    expect(resolveMusicSources(publicDir)).toEqual([null, "/audio/Winter-Long-Version.mp3", null, "/audio/Roa-Dream-Up.ogg", null]);
  });
});

describe("music preference", () => {
  it("defaults to on, the first track, at a comfortable 40%", () => {
    expect(DEFAULT_MUSIC_VOLUME).toBe(0.4);
    expect(parsePersistedMusic(null)).toEqual({ isMusicEnabled: true, currentTrack: 0, volume: 0.4 });
  });

  it("restores a stored choice — including off — and rejects malformed values", () => {
    expect(parsePersistedMusic(JSON.stringify({ enabled: false, track: 2, volume: 0.1 }))).toEqual({
      isMusicEnabled: false,
      currentTrack: 2,
      volume: 0.1,
    });
    expect(parsePersistedMusic(JSON.stringify({ enabled: "yes", track: 9, volume: 4 }))).toEqual({
      isMusicEnabled: true,
      currentTrack: 0,
      volume: 0.4,
    });
    expect(parsePersistedMusic("{not json")).toEqual({ isMusicEnabled: true, currentTrack: 0, volume: 0.4 });
  });

  it("maps the slider to a smooth curve: full scale at 100%, comfortable in the middle, silent at 0", () => {
    expect(volumeToDb(1)).toBeCloseTo(0);
    expect(volumeToDb(0.4)).toBeCloseTo(-8.75, 1);
    expect(volumeToDb(0)).toBe(-80);
    for (let v = 0.02; v <= 1; v += 0.02) expect(volumeToDb(v)).toBeGreaterThan(volumeToDb(v - 0.02));
  });
});

describe("MusicPlayer", () => {
  // jsdom can't play media: `play()` behaves like a browser whose autoplay
  // policy refuses sound (a rejected promise, as real browsers do).
  const tried: string[] = [];
  const play = jest.fn(function (this: HTMLMediaElement) {
    tried.push(this.src);
    return Promise.reject(new DOMException("autoplay refused", "NotAllowedError"));
  });
  beforeAll(() => {
    Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: play });
    Object.defineProperty(HTMLMediaElement.prototype, "pause", { configurable: true, value: () => undefined });
    Object.defineProperty(HTMLMediaElement.prototype, "load", { configurable: true, value: () => undefined });
  });

  const serve = (sources: (string | null)[]) => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ sources }) }) as unknown as typeof fetch;
  };
  const ALL = MUSIC_TRACKS.map((track) => track.src);

  it("tries to autoplay track 01 on a fresh visit; when the browser refuses, shows Ready — never a fake Playing", async () => {
    serve(ALL);
    render(<MusicPlayer />);
    await waitFor(() => expect(play).toHaveBeenCalled());
    expect(tried[0]).toMatch(/\/audio\/Warm-Memories-Emotional-Inspiring-Piano\.mp3$/);
    await waitFor(() => expect(screen.getByRole("group", { name: /music player: 01 — warm memories, ready/i })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Play music" })).toBeEnabled();
    expect(screen.queryByText(/^playing$/i)).not.toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith("/api/music-sources", expect.anything());
  });

  it("never starts music from a click, key, focus or visibility event elsewhere on the page", async () => {
    serve(ALL);
    const user = userEvent.setup();
    render(
      <>
        <button type="button">elsewhere</button>
        <MusicPlayer />
      </>
    );
    await waitFor(() => expect(play).toHaveBeenCalled());
    const before = play.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "elsewhere" }));
    await user.keyboard("{Enter}");
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
    expect(play.mock.calls.length).toBe(before);
    expect(screen.getByRole("button", { name: "Play music" })).toBeEnabled();
  });

  it("puts every control directly in the bar — no dialog, no popup panel", async () => {
    serve(ALL);
    const user = userEvent.setup();
    render(<MusicPlayer />);
    expect(screen.getByRole("button", { name: "Previous track" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next track" })).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: /show volume and music on\/off/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("slider", { name: "Music volume" })).toHaveValue("40");
    expect(screen.getByRole("switch", { name: /music on/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("acknowledges changes inline: 01 → 02, and Music off / on, without any confirmation", async () => {
    serve(ALL);
    const user = userEvent.setup();
    render(<MusicPlayer />);
    await user.click(screen.getByRole("button", { name: "Next track" }));
    await waitFor(() => expect(screen.getByRole("group", { name: /music player: 02 — winter/i })).toBeInTheDocument());
    expect(screen.getAllByText(/01 → 02/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /show volume/i }));
    await user.click(screen.getByRole("switch", { name: /music on/i }));
    expect(screen.getByRole("switch", { name: /music off/i })).toHaveAttribute("aria-checked", "false");
    expect(screen.getAllByText(/music off/i).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("switch", { name: /music off/i }));
    expect(screen.getByRole("switch", { name: /music on/i })).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("button", { name: "Previous track" }));
    await waitFor(() => expect(screen.getByRole("group", { name: /music player: 01 — warm memories/i })).toBeInTheDocument());
  });

  it("marks a missing track as unavailable, quietly — no progress, no fake playback — and Next/Previous still work", async () => {
    serve([null, null, null, null, null]);
    const user = userEvent.setup();
    render(<MusicPlayer />);
    await waitFor(() => expect(screen.getByRole("group", { name: /music player: 01 — warm memories, unavailable/i })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Play music" })).toBeDisabled();
    expect(screen.queryByText(/^playing$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d:\d\d/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next track" }));
    await waitFor(() => expect(screen.getByRole("group", { name: /music player: 02 — winter, unavailable/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Previous track" }));
    await user.click(screen.getByRole("button", { name: "Previous track" }));
    await waitFor(() => expect(screen.getByRole("group", { name: /music player: 05 — powerful emotional trailer/i })).toBeInTheDocument());
  });
});
