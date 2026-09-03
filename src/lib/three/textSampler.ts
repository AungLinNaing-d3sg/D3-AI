/**
 * Samples a word into a cloud of point positions by rasterising it onto an
 * offscreen 2D canvas and reading back which pixels are "ink". This is what
 * lets the Typography (chapter 02) and Data Universe (chapter 04) scenes
 * treat huge words as *physical* particle formations — every letter is
 * actually thousands of individual WebGL points that can explode, drift, and
 * reform — rather than flat HTML text or a font-geometry asset.
 *
 * Deliberately uses a bundled system font (no network font fetch): the
 * result only needs to read as bold block letters, not match the page's
 * display typeface pixel-for-pixel, and this keeps the site's strict
 * `script-src 'self'` CSP (see next.config.ts) trivially satisfied.
 *
 * Client-only — must be called from inside `useEffect`/`useMemo` in a
 * component that only ever mounts in the browser (the whole 3D `Experience`
 * tree is already dynamically imported with `ssr: false`).
 */
export function sampleTextPoints(
  text: string,
  count: number,
  resolution = 220,
  worldScale = 3.6
): Float32Array {
  const positions = new Float32Array(count * 3);

  if (typeof document === "undefined" || count <= 0) {
    return positions;
  }

  const canvas = document.createElement("canvas");
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return positions;

  ctx.clearRect(0, 0, resolution, resolution);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let fontSize = resolution * 0.62;
  ctx.font = `900 ${fontSize}px "Arial Black", Arial, sans-serif`;
  const maxWidth = resolution * 0.9;
  while (ctx.measureText(text).width > maxWidth && fontSize > 10) {
    fontSize -= 2;
    ctx.font = `900 ${fontSize}px "Arial Black", Arial, sans-serif`;
  }
  ctx.fillText(text, resolution / 2, resolution / 2 + fontSize * 0.02);

  const { data } = ctx.getImageData(0, 0, resolution, resolution);
  const candidates: number[] = [];
  const step = resolution > 160 ? 2 : 1;
  for (let y = 0; y < resolution; y += step) {
    for (let x = 0; x < resolution; x += step) {
      const alpha = data[(y * resolution + x) * 4 + 3] ?? 0;
      if (alpha > 128) {
        candidates.push(x, y);
      }
    }
  }

  const candidatePairs = candidates.length / 2;

  for (let i = 0; i < count; i += 1) {
    let px: number;
    let py: number;

    if (candidatePairs > 0) {
      const pairIndex = Math.floor(Math.random() * candidatePairs) * 2;
      px = candidates[pairIndex] ?? resolution / 2;
      py = candidates[pairIndex + 1] ?? resolution / 2;
    } else {
      px = Math.random() * resolution;
      py = Math.random() * resolution;
    }

    const nx = (px / resolution - 0.5) * 2;
    const ny = -(py / resolution - 0.5) * 2;

    positions[i * 3] = nx * worldScale;
    positions[i * 3 + 1] = ny * worldScale;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.7;
  }

  return positions;
}

/** Generates a chaotic, evenly-distributed "scattered" cloud the same size
 * as a sampled word — the mid-point every typography transition passes
 * through (letters "break apart... scatter into particles"). */
export function scatterPoints(count: number, radius = 6): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const r = radius * (0.4 + Math.random() * 0.6);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
    positions[i * 3 + 2] = r * Math.cos(phi) * 0.5;
  }
  return positions;
}

/** Generates a large-scale, multi-armed "galaxy" point field — the resting
 * state the Data Universe chapter (04) travels through between statistic
 * formations, giving it a distinct sense of depth/scale from the tighter
 * typography scatter above. */
export function galaxyPoints(count: number, radius = 8): Float32Array {
  const positions = new Float32Array(count * 3);
  const arms = 3;
  for (let i = 0; i < count; i += 1) {
    const t = Math.random();
    const armOffset = ((i % arms) / arms) * Math.PI * 2;
    const angle = t * Math.PI * 4 + armOffset;
    const spread = (1 - t) * 0.6 + 0.15;
    const jitteredAngle = angle + (Math.random() - 0.5) * spread;
    const r = t * radius;
    positions[i * 3] = Math.cos(jitteredAngle) * r;
    positions[i * 3 + 1] = (Math.random() - 0.5) * radius * 0.22 * (1 - t * 0.5);
    positions[i * 3 + 2] = Math.sin(jitteredAngle) * r - radius * 0.25;
  }
  return positions;
}
