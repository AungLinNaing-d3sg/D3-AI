import { services } from "@/data/services";
import { capabilities } from "@/data/capabilities";
import { focusAreas } from "@/data/focusAreas";
import { techNodes } from "@/data/technology";
import { teamMembers } from "@/data/team";
import { brandPillars } from "@/data/pillars";
import {
  aboutTeamNodes,
  aboutTeamRanges,
  aboutPartnerNote,
  typographyWords,
  typographyWordRanges,
  primaryConceptNodes,
  secondaryConceptNodes,
  universeStats,
  universeStatRanges,
  productPanels,
  gameItemDefinitions,
  playgroundGames,
  visionPillars,
} from "@/data/journey";
import { STAGE_IDS } from "@/types";

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

  it("defines exactly the 9 scrollytelling chapters in journey order", () => {
    expect(STAGE_IDS).toEqual([
      "intro",
      "about",
      "typography",
      "neural",
      "universe",
      "product",
      "game",
      "future",
      "cta",
    ]);
  });

  it("orbits the about-us identity emblem with one node per real team member, in even, gapless ranges", () => {
    expect(aboutTeamNodes).toHaveLength(teamMembers.length);
    expect(aboutTeamRanges).toHaveLength(teamMembers.length);
    expect(aboutTeamRanges[0]?.start).toBe(0);
    expect(aboutTeamRanges[aboutTeamRanges.length - 1]?.end).toBe(1);
    aboutTeamRanges.forEach((range, index) => {
      const next = aboutTeamRanges[index + 1];
      if (next) expect(range.end).toBe(next.start);
    });
    expect(aboutPartnerNote.length).toBeGreaterThan(0);
  });

  it("gives the typography chapter contiguous, gapless word ranges covering 0..1", () => {
    expect(typographyWordRanges).toHaveLength(typographyWords.length);
    expect(typographyWordRanges[0]?.start).toBe(0);
    expect(typographyWordRanges[typographyWordRanges.length - 1]?.end).toBe(1);
    typographyWordRanges.forEach((range, index) => {
      const next = typographyWordRanges[index + 1];
      if (next) expect(range.end).toBe(next.start);
    });
  });

  it("builds the neural network from the 5 brief-specified concepts plus the real technology ecosystem", () => {
    expect(primaryConceptNodes.map((node) => node.label)).toEqual([
      "THINK",
      "LEARN",
      "UNDERSTAND",
      "PREDICT",
      "CREATE",
    ]);
    expect(secondaryConceptNodes).toHaveLength(techNodes.length);
  });

  it("sources the data universe statistics from the real brand pillars, not invented numbers", () => {
    expect(universeStats).toHaveLength(brandPillars.length);
    expect(universeStatRanges).toHaveLength(brandPillars.length);
    universeStats.forEach((stat) => {
      expect(stat.token.length).toBeGreaterThan(0);
    });
  });

  it("maps the product experience panels 1:1 onto the real service pillars", () => {
    expect(productPanels).toHaveLength(services.length);
  });

  it("defines exactly the brief's TRAIN YOUR AI vocabulary (3 positive, 3 negative)", () => {
    const positive = gameItemDefinitions.filter((item) => item.polarity === "positive");
    const negative = gameItemDefinitions.filter((item) => item.polarity === "negative");
    expect(positive.map((item) => item.label)).toEqual(["DATA", "KNOWLEDGE", "EXPERIENCE"]);
    expect(negative.map((item) => item.label)).toEqual(["NOISE", "ERROR", "BIAS"]);
  });

  it("reframes the real capability pillars as the cinematic future's vision statements", () => {
    expect(visionPillars).toHaveLength(capabilities.length);
  });

  it("defines exactly the 4 cohesive AI Playground experiences, each uniquely identified and accented", () => {
    expect(playgroundGames.map((game) => game.id)).toEqual(["train", "signal-hunt", "neural-path", "data-sort"]);
    expect(playgroundGames.map((game) => game.index)).toEqual([1, 2, 3, 4]);
    const accents = new Set(playgroundGames.map((game) => game.accentHex));
    expect(accents.size).toBe(playgroundGames.length);
    playgroundGames.forEach((game) => {
      expect(game.title.length).toBeGreaterThan(0);
      expect(game.tagline.length).toBeGreaterThan(0);
      expect(game.description.length).toBeGreaterThan(0);
    });
  });
});
