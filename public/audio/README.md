# Background music — audio files

The site's background music player plays these five instrumental tracks, in
this order:

| #  | Title                      | Artist (from file tags) | File                                          |
| -- | -------------------------- | ----------------------- | --------------------------------------------- |
| 01 | Warm Memories              | — (not tagged)          | `Warm-Memories-Emotional-Inspiring-Piano.mp3` |
| 02 | Winter                     | Alex-Productions        | `Winter-Long-Version.mp3`                     |
| 03 | Precious Memories          | Shane Ivers             | `precious-memories.mp3`                       |
| 04 | Dream Up                   | Roa                     | `Roa-Dream-Up.mp3`                            |
| 05 | Powerful Emotional Trailer | MaxKoMusic              | `Powerful-Emotional-Trailer.mp3`              |

- Licensing: these files were supplied for the site. Before going live,
  confirm each track's licence and add any attribution it requires (many
  "royalty-free / no-copyright" tracks require a credit to the artist).
- Next.js serves this folder at `/audio/…` (e.g. `/audio/Roa-Dream-Up.mp3`).
- Each track has a loudness trim (`gainDb` in `src/lib/audio/musicTracks.ts`)
  measured from its file so all five play at a similar level — re-measure it
  if you replace a file.
- A missing file shows as unavailable in the player (Play disabled) and is
  never requested. In production, redeploy after changing files — Next.js
  only serves `public/` files that existed at build time.

The track list is configured in `src/lib/audio/musicTracks.ts`.
