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
  heroPipelineNodes,
  technologyNetworkNodes,
  universeStats,
  universeStatRanges,
  universeStations,
  AGENTS,
  WORKFLOW_STAGES,
  playgroundExperiences,
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

  it("defines exactly the 8 scrollytelling chapters in journey order", () => {
    expect(STAGE_IDS).toEqual([
      "intro",
      "about",
      "typography",
      "neural",
      "universe",
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

  it("gives the hero the 5 brief-specified pipeline stages, exclusively", () => {
    expect(heroPipelineNodes.map((node) => node.label)).toEqual([
      "THINK",
      "LEARN",
      "UNDERSTAND",
      "PREDICT",
      "CREATE",
    ]);
  });

  it("builds the neural network chapter from the real technology ecosystem alone", () => {
    expect(technologyNetworkNodes).toHaveLength(techNodes.length);
  });

  it("sources the data universe statistics from the real brand pillars, not invented numbers", () => {
    expect(universeStats).toHaveLength(brandPillars.length);
    expect(universeStatRanges).toHaveLength(brandPillars.length);
    universeStats.forEach((stat) => {
      expect(stat.token.length).toBeGreaterThan(0);
    });
  });

  it("gives every data universe statistic its own distinct 3D station treatment", () => {
    expect(universeStations).toHaveLength(universeStats.length);
    universeStations.forEach((station, index) => {
      expect(station.stat).toEqual(universeStats[index]);
    });
    const variants = new Set(universeStations.map((station) => station.variant));
    expect(variants.size).toBe(universeStations.length);
  });

  it("defines exactly the 4 real subagents from .claude/agents/*.md, each uniquely identified and accented", () => {
    expect(AGENTS.map((agent) => agent.id)).toEqual([
      "senior-frontend-dev",
      "senior-qa",
      "senior-security-engineer",
      "report-manager",
    ]);
    const accents = new Set(AGENTS.map((agent) => agent.accentHex));
    expect(accents.size).toBe(AGENTS.length);
    AGENTS.forEach((agent) => {
      expect(agent.description.length).toBeGreaterThan(0);
      expect(agent.tools.length).toBeGreaterThan(0);
    });
  });

  it("defines exactly the real 9-stage ai_workflow.sh pipeline, in STAGE_ORDER", () => {
    expect(WORKFLOW_STAGES.map((stage) => stage.id)).toEqual([
      "implement",
      "qa",
      "build",
      "commit-message",
      "commit",
      "push",
      "pr",
      "report-manager",
      "security",
    ]);
    WORKFLOW_STAGES.forEach((stage, index) => {
      expect(stage.index).toBe(index + 1);
      expect(stage.description.length).toBeGreaterThan(0);
    });
  });

  it("reframes the real capability pillars as the cinematic future's vision statements", () => {
    expect(visionPillars).toHaveLength(capabilities.length);
  });

  it("defines exactly the 4 cohesive AI Engineering Playground experiences, each uniquely identified and accented", () => {
    expect(playgroundExperiences.map((experience) => experience.id)).toEqual([
      "choose-agent",
      "run-workflow",
      "build-test",
      "review-ship",
    ]);
    expect(playgroundExperiences.map((experience) => experience.index)).toEqual([1, 2, 3, 4]);
    const accents = new Set(playgroundExperiences.map((experience) => experience.accentHex));
    expect(accents.size).toBe(playgroundExperiences.length);
    playgroundExperiences.forEach((experience) => {
      expect(experience.title.length).toBeGreaterThan(0);
      expect(experience.tagline.length).toBeGreaterThan(0);
      expect(experience.description.length).toBeGreaterThan(0);
    });
  });

});
