import { ExtrudeGeometry, LatheGeometry, Shape, Vector2, type BufferGeometry } from "three";

/**
 * Geometry builders for the Vision Unit (vision/VisionRobot.tsx): sculpted,
 * tapered limb shells and softly bevelled plates — so the robot reads as
 * designed industrial forms rather than boxes and cylinders.
 */

/** A bevelled, rounded-corner box, centred on the origin. */
export function roundedBox(width: number, height: number, depth: number, radius: number, smooth = 4): BufferGeometry {
  const bevel = Math.min(radius * 0.6, depth * 0.3);
  const w = width - bevel * 2;
  const h = height - bevel * 2;
  const r = Math.min(radius, w / 2, h / 2);
  const shape = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const g = new ExtrudeGeometry(shape, {
    depth: Math.max(0.001, depth - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: smooth,
    curveSegments: smooth * 2,
  });
  g.center();
  g.computeVertexNormals();
  return g;
}

/**
 * A limb shell hanging down from its joint (y = 0 to y = -length): tapered
 * from `top` to `bottom` radius with a gentle muscular swell, closed with
 * rounded caps, slightly flattened front-to-back.
 */
export function limbShell(top: number, bottom: number, length: number, swell: number, segments: number): BufferGeometry {
  const points: Vector2[] = [];
  const steps = 22;
  points.push(new Vector2(0.0005, top * 0.35));
  points.push(new Vector2(top * 0.62, top * 0.22));
  points.push(new Vector2(top * 0.92, top * 0.06));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const r = top + (bottom - top) * t + swell * Math.sin(Math.PI * Math.pow(t, 0.8));
    points.push(new Vector2(r, -t * length));
  }
  points.push(new Vector2(bottom * 0.92, -length - bottom * 0.06));
  points.push(new Vector2(bottom * 0.62, -length - bottom * 0.22));
  points.push(new Vector2(0.0005, -length - bottom * 0.35));
  const g = new LatheGeometry(points, segments);
  g.scale(1, 1, 0.88);
  g.computeVertexNormals();
  return g;
}
