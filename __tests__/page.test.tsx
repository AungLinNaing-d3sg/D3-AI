import { render, screen } from "@testing-library/react";
import Home from "@/app/page";
import { siteConfig } from "@/data/site";

// The 3D canvas and scroll choreographer are exercised by their own unit
// tests / the (mocked) @react-three/fiber + @react-three/drei modules; here
// we only assert the page composes all 8 real-content chapters correctly.
jest.mock("@/components/three/SceneCanvas", () => ({
  SceneCanvas: () => <div data-testid="mock-scene-canvas" />,
}));
jest.mock("@/components/motion/ScrollChoreographer", () => ({
  ScrollChoreographer: () => null,
}));

describe("Home page", () => {
  it("renders the decorative scene canvas alongside all 8 story chapters", () => {
    render(<Home />);

    expect(screen.getByTestId("mock-scene-canvas")).toBeInTheDocument();

    const sectionIds = [
      "hero",
      "about",
      "services",
      "solutions",
      "projects",
      "technology",
      "company",
      "contact",
    ];

    sectionIds.forEach((id) => {
      expect(document.getElementById(id)).toBeInTheDocument();
    });
  });

  it("renders the hero tagline as the page's single top-level heading", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: siteConfig.tagline })).toBeInTheDocument();
  });
});
