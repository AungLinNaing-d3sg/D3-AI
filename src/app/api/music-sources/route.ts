import { resolveMusicSources } from "@/lib/audio/musicSources";

/**
 * Which soundtrack files are present under `public/audio/`, checked on every
 * request (never cached), so the music player picks up newly added files
 * without a code change — and the browser never has to probe (and 404 on) a
 * missing file itself. Always 200: `{ sources: (string | null)[] }`.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ sources: resolveMusicSources() }, { headers: { "Cache-Control": "no-store" } });
}
