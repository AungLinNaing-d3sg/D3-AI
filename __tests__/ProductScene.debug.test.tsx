import { render, screen } from "@testing-library/react";
import { ProductScene } from "@/components/three/scenes/ProductScene";
import { productPanels } from "@/data/journey";

/**
 * Chapter 06 (AI Product Experience) 3D scene. `@react-three/fiber` and
 * `@react-three/drei` are stubbed for the whole suite (see jest.config.ts
 * `moduleNameMapper` + src/test/mocks/*) since jsdom has no WebGL context —
 * `useFrame` is a no-op there, so this suite can only assert the *static*
 * render tree (structure/content), not the per-frame opacity/scale
 * animation math itself (unreachable without a real frame loop).
 *
 * Regression coverage for the new "AI core" + per-panel 3D hologram
 * (`AiCore`/`DataDevice`/`DynamicsDevice`/`DigitalDevice` in
 * components/three/scenes/ProductScene.tsx): one hologram must be mounted
 * per real service panel, in the same order as `src/data/services.ts`
 * (Data, Dynamics, Digital) — picked by index, not by name — and the
 * accessible HTML dashboard content (already covered indirectly for the
 * DOM fallback via __tests__/sections.test.tsx `ProductSection`) must keep
 * rendering unchanged alongside the new decorative hologram.
 */
describe("ProductScene", () => {
  it("renders without crashing for both quality tiers", () => {
    expect(() => render(<ProductScene quality="high" />)).not.toThrow();
    expect(() => render(<ProductScene quality="low" />)).not.toThrow();
  });

  it("renders exactly one accessible HTML dashboard per real service panel", () => {
    render(<ProductScene quality="high" />);
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings).toHaveLength(productPanels.length);
    productPanels.forEach((panel) => {
      expect(screen.getByRole("heading", { level: 3, name: panel.title })).toBeInTheDocument();
      expect(screen.getByText(panel.eyebrow)).toBeInTheDocument();
      expect(screen.getByText(panel.summary)).toBeInTheDocument();
    });
  });

  it("renders a single shared AI-core hologram regardless of panel count", () => {
    const { container } = render(<ProductScene quality="high" />);
    // AiCore renders exactly one icosahedron-based core + wireframe shell.
    expect(container.querySelectorAll("icosahedrongeometry")).toHaveLength(2);
  });

  it("mounts one themed hologram per panel, ordered to match services.ts (Data, Dynamics, Digital)", () => {
    const { container } = render(<ProductScene quality="high" />);

    // DataDevice: 4 stacked discs + 1 wireframe shell, all cylinders.
    expect(container.querySelectorAll("cylindergeometry")).toHaveLength(5);
    // DynamicsDevice: 1 torus-knot core.
    expect(container.querySelectorAll("torusknotgeometry")).toHaveLength(1);
    // DigitalDevice: 1 box body (+ a plane screen, shared tag with none else).
    expect(container.querySelectorAll("boxgeometry")).toHaveLength(1);
    expect(container.querySelectorAll("planegeometry")).toHaveLength(1);
    // 1 Dynamics ring + 2 AiCore rings = 3 plain toruses.
    expect(container.querySelectorAll("torusgeometry")).toHaveLength(3);
  });

  it("keeps one hologram host <group> per real panel, plus the shared AI core group", () => {
    const { container } = render(<ProductScene quality="high" />);
    // 1 root group + 1 AiCore group + (1 panel group + 1 device group) each.
    expect(container.querySelectorAll("group")).toHaveLength(2 + productPanels.length * 2);
  });
});
