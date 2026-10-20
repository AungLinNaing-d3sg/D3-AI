import { CanvasTexture, PMREMGenerator, SRGBColorSpace, type Texture, type WebGLRenderer } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * One soft studio reflection map per renderer, shared by every scene that
 * asks for it (instead of each building its own PMREM), applied per
 * material — never as `scene.environment`, so no other chapter changes.
 * Kept for the page's lifetime (one small texture).
 */
const envCache = new WeakMap<WebGLRenderer, Texture>();

export function getStudioEnv(gl: WebGLRenderer): Texture {
  const cached = envCache.get(gl);
  if (cached) return cached;
  const pmrem = new PMREMGenerator(gl);
  const room = new RoomEnvironment();
  const texture = pmrem.fromScene(room, 0.03).texture;
  room.dispose();
  pmrem.dispose();
  envCache.set(gl, texture);
  return texture;
}

let glowTexture: CanvasTexture | null = null;

/** A soft radial glow (white, alpha falloff) for additive sprite halos —
 * tinted by each sprite's material colour. Built once and shared. */
export function getGlowTexture(): CanvasTexture {
  if (glowTexture) return glowTexture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.18, "rgba(255,255,255,0.55)");
    g.addColorStop(0.45, "rgba(255,255,255,0.14)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  glowTexture = new CanvasTexture(canvas);
  glowTexture.colorSpace = SRGBColorSpace;
  return glowTexture;
}
