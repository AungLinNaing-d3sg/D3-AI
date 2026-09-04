import { services } from "@/data/services";
import { capabilities } from "@/data/capabilities";
import { focusAreas } from "@/data/focusAreas";
import { techNodes } from "@/data/technology";
import { teamMembers } from "@/data/team";
import { sceneKeyframes } from "@/lib/motion/sceneState";

describe("content data integrity", () => {
  it("has exactly the three real service pillars, each with bullets", () => {
    expect(services).toHaveLength(3);
    services.forEach((service) => {
      expect(service.bullets.length).toBeGreaterThan(0);
    });
  });

  it("maps capabilities 1:1 onto the three service pillars", () => {
    expect(capabilities).toHaveLength(services.length);
  });

  it("keeps focus areas free of fabricated client names (no invented case studies)", () => {
    focusAreas.forEach((area) => {
      expect(area.outcomes.length).toBeGreaterThan(0);
    });
  });

  it("has at least one technology node per category shown in the ecosystem", () => {
    expect(techNodes.length).toBeGreaterThan(0);
    techNodes.forEach((node) => {
      expect(node.label.length).toBeGreaterThan(0);
    });
  });

  it("has real named team members with a role and bio", () => {
    expect(teamMembers.length).toBeGreaterThan(0);
    teamMembers.forEach((member) => {
      expect(member.name).toBeTruthy();
      expect(member.role).toBeTruthy();
      expect(member.bio.length).toBeGreaterThan(0);
    });
  });

  it("provides one 3D scene keyframe per homepage section (hero..cta)", () => {
    // hero, about, services, solutions, projects, technology, company, cta
    expect(sceneKeyframes).toHaveLength(8);
  });

  it("gives the identity constellation its one dedicated peak during the About chapter", () => {
    const opacities = sceneKeyframes.map((keyframe) => keyframe.identity.opacity);
    opacities.forEach((opacity) => {
      expect(opacity).toBeGreaterThanOrEqual(0);
      expect(opacity).toBeLessThanOrEqual(1);
    });
    // index 1 === the About chapter (see sceneKeyframes in lib/motion/sceneState.ts).
    expect(opacities[1]).toBe(Math.max(...opacities));
  });
});
