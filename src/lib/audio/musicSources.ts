import { existsSync } from "node:fs";
import path from "node:path";
import { MUSIC_TRACKS, sourceCandidates } from "@/lib/audio/musicTracks";

/**
 * Server-only: for each soundtrack track, the browser URL of its audio file
 * if one is present under `public/` (the configured `src` first, then the
 * same name as .mp3/.wav/.ogg), or `null` if none has been added. Only the
 * static URLs from the track configuration are ever checked.
 */
export function resolveMusicSources(publicDir = path.join(process.cwd(), "public")): (string | null)[] {
  return MUSIC_TRACKS.map(
    (track) => sourceCandidates(track).find((url) => existsSync(path.join(publicDir, ...url.split("/").filter(Boolean)))) ?? null
  );
}
