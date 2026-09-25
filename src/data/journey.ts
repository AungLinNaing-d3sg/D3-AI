import type {
  AgentDefinition,
  ConceptNode,
  PlaygroundExperienceDefinition,
  PlaygroundExperienceId,
  UniverseStat,
  UniverseStation,
  UniverseStationVariant,
  VisionPillar,
  WorkflowStageDefinition,
} from "@/types";
import { capabilities } from "@/data/capabilities";
import { brandPillars } from "@/data/pillars";
import { techNodes } from "@/data/technology";
import { teamMembers } from "@/data/team";

/**
 * Chapter 02 — About Us / Who we are. The leadership team (src/data/team.ts,
 * sourced from the existing About Us page copy — see /docs/AboutUs.png) is
 * rendered as orbiting "identity nodes" around a central emblem in the 3D
 * scene (three/scenes/AboutScene.tsx); positions are evenly distributed
 * around the emblem rather than hand-placed, same approach as the neural
 * network's secondary nodes below.
 */
export const aboutTeamNodes: ConceptNode[] = teamMembers.map((member, index) => {
  const angle = (index / teamMembers.length) * Math.PI * 2;
  const radius = 2.1;
  return {
    id: member.initials,
    label: member.initials,
    position: [Math.cos(angle) * radius, Math.sin(angle * 1.4) * 0.5, Math.sin(angle) * radius * 0.6],
  };
});

/** Even scroll-progress ranges for each team member above, shared by the 3D
 * orbiting-node highlight and the DOM team-card highlight so both read from
 * the same single source of truth — same pattern as `universeStatRanges`. */
export const aboutTeamRanges = teamMembers.map((member, index) => ({
  member,
  start: index / teamMembers.length,
  end: (index + 1) / teamMembers.length,
}));

/** Short, sourced continuation of the "Who we are" narrative — the one
 * sentence from the existing About Us page copy (/docs/AboutUs.png) not yet
 * carried elsewhere: working alongside delivery partners to cover the full
 * breadth of a client's IT transformation. */
export const aboutPartnerNote =
  "Working alongside partners who offer complementary or value-added services, so we can serve your organisation's varied IT transformation needs.";

/**
 * Chapter 03 — 3D AI Typography. The word sequence particles form/explode/
 * reform through, grounded in the three real service pillars
 * (src/data/services.ts) rather than generic buzzwords, ending on "AI" as
 * the bridge into the Neural Network chapter. No longer opens on "D3-SG" —
 * removed from the cycle (both the particle formation and its card) so the
 * chapter reads as 4 evenly-balanced disciplines rather than 5.
 */
export const typographyWords = ["DATA", "DYNAMICS", "DIGITAL", "AI"] as const;

/** Even scroll-progress ranges for each word above, shared by the 3D
 * particle-morph scene and the DOM caption overlay so both read from the
 * same single source of truth instead of duplicating the timing math. */
export const typographyWordRanges = typographyWords.map((word, index) => ({
  word,
  start: index / typographyWords.length,
  end: (index + 1) / typographyWords.length,
}));

/**
 * Chapter 01 — Cinematic AI Intro. The five-stage thought pipeline (verbatim
 * from the brief — THINK, LEARN, UNDERSTAND, PREDICT, CREATE) that orbits the
 * hero's central "AI core" (see three/scenes/IntroScene.tsx). Lives
 * exclusively in the hero now — no other chapter renders these nodes, so the
 * floating pipeline reads as this chapter's own signature moment rather than
 * a component reused throughout the page.
 */
export const heroPipelineNodes: ConceptNode[] = [
  { id: "think", label: "THINK", position: [0, 0.9, 0] },
  { id: "learn", label: "LEARN", position: [1.5, -0.2, 0.6] },
  { id: "understand", label: "UNDERSTAND", position: [-1.6, -0.1, 0.9] },
  { id: "predict", label: "PREDICT", position: [0.9, -0.9, -0.8] },
  { id: "create", label: "CREATE", position: [-0.9, 0.4, -1.1] },
];

/**
 * Chapter 04 — Neural Network / technology ecosystem. The real technology
 * stack (src/data/technology.ts) arranged as its own standalone network
 * around a central hub — no longer "secondary" to the hero pipeline above
 * (that moved to chapter 01), this is chapter 04's entire, self-contained
 * visual now.
 */
export const technologyNetworkNodes: ConceptNode[] = techNodes.map((node, index) => {
  const angle = (index / techNodes.length) * Math.PI * 2;
  const radius = 2.6;
  return {
    id: node.id,
    label: node.label,
    position: [
      Math.cos(angle) * radius,
      Math.sin(angle * 1.7) * 0.9,
      Math.sin(angle) * radius,
    ],
  };
});

/**
 * Chapter 05 — Data Universe. Real, modest proof points
 * (src/data/pillars.ts, sourced from the existing company copy) rendered as
 * particle-formed short tokens rather than invented statistics.
 */
export const universeStats: UniverseStat[] = brandPillars.map((pillar) => ({
  token: pillar.value,
  label: pillar.label,
  description: pillar.description,
}));

/** Even scroll-progress ranges for each statistic above, shared by the 3D
 * particle-formation scene and the DOM caption overlay. */
export const universeStatRanges = universeStats.map((stat, index) => ({
  stat,
  start: index / universeStats.length,
  end: (index + 1) / universeStats.length,
}));

/** Fixed, hand-authored order matching `brandPillars`/`universeStats`
 * (Singapore, 20+ years, Microsoft, Real-world) — see
 * `UniverseStationVariant` in src/types/index.ts for what each treatment
 * communicates. Order matters and is not re-derived from content, since the
 * *meaning* of each variant is tied to which real statistic it is. */
const universeStationVariants: UniverseStationVariant[] = ["location", "timeline", "network", "impact"];

/**
 * Chapter 05 — Data Universe "stations". Pairs each real, sourced statistic
 * with the distinct 3D visual treatment the camera dollies to as the user
 * scrolls (see three/scenes/UniverseScene.tsx) — the redesigned data
 * universe gives each stat its own composition instead of one particle field
 * recoloured four times.
 */
export const universeStations: UniverseStation[] = universeStats.map((stat, index) => ({
  stat,
  variant: universeStationVariants[index] ?? "impact",
}));

/**
 * Chapter 06 — "AI ENGINEERING PLAYGROUND". The 4 real subagents defined in
 * `.claude/agents/*.md` — verbatim names, roles, responsibilities, tools, and
 * access scope, not invented personas. Single source of truth read by
 * `AgentSelectExperience` and `WorkflowRunExperience` alike.
 */
export const AGENTS: AgentDefinition[] = [
  {
    id: "senior-frontend-dev",
    index: 1,
    name: "senior-frontend-dev",
    role: "Senior Frontend Developer",
    description:
      "Builds responsive, accessible, maintainable UI components for the Next.js application, integrates REST APIs, implements JWT-based authentication, and optimizes frontend performance.",
    tools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob"],
    accessLabel: "Full read/write · may install packages",
    accentHex: "#fd6a50",
  },
  {
    id: "senior-qa",
    index: 2,
    name: "senior-qa",
    role: "Senior Frontend QA Engineer",
    description:
      "Writes and maintains unit, integration, and end-to-end tests. Validates UI behaviour, API integration, authentication flows, responsiveness, accessibility, cross-browser compatibility, and edge cases.",
    tools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob"],
    accessLabel: "Full read/write to test files",
    accentHex: "#22d3ee",
  },
  {
    id: "senior-security-engineer",
    index: 3,
    name: "senior-security-engineer",
    role: "Senior Security Engineer",
    description:
      "Reviews the git diff for OWASP risks, XSS, injection vulnerabilities, authentication/authorization weaknesses, secrets exposure, and insecure configuration. Returns a severity-rated report.",
    tools: ["Read", "Grep", "Glob", "Bash"],
    accessLabel: "Review-only · never edits or commits",
    accentHex: "#fb7185",
  },
  {
    id: "report-manager",
    index: 4,
    name: "report-manager",
    role: "Report Manager",
    description:
      "Compiles a structured report from the other agents' work using git log and git diff, module by module.",
    tools: ["Read", "Bash", "Grep", "Glob"],
    accessLabel: "Read-only · no build or install commands",
    accentHex: "#a78bfa",
  },
];

/**
 * Chapter 06 — the real, fixed-order stages of `scripts/ai_workflow.sh`
 * (`STAGE_ORDER=(implement qa build commit-message commit push pr
 * report-manager security)`). Single source of truth read by
 * `WorkflowRunExperience`, `BuildTestExperience`, and `ReviewShipExperience`.
 */
export const WORKFLOW_STAGES: WorkflowStageDefinition[] = [
  {
    id: "implement",
    index: 1,
    label: "Implement",
    description: "Creates/switches to branch ai/<feature-name> and invokes senior-frontend-dev to build the feature.",
    agentId: "senior-frontend-dev",
    command: 'scripts/ai_workflow.sh "feature-name" "feature description"',
    flowLabel: "AI AGENT",
  },
  {
    id: "qa",
    index: 2,
    label: "QA",
    description: "Invokes senior-qa against the current diff. A FAIL in its output aborts the pipeline.",
    agentId: "senior-qa",
    command: null,
    flowLabel: "AI AGENT",
  },
  {
    id: "build",
    index: 3,
    label: "Build",
    description:
      "Runs npm i && npm run build, npm run lint, npm run test -- --watchAll=false --passWithNoTests. Build/test failures abort; lint only warns.",
    agentId: null,
    command: "npm run build",
    flowLabel: "WORKFLOW",
  },
  {
    id: "commit-message",
    index: 4,
    label: "Commit Message",
    description: "Generates a conventional commit message and a markdown PR description.",
    agentId: "senior-frontend-dev",
    command: null,
    flowLabel: "WORKFLOW",
  },
  {
    id: "commit",
    index: 5,
    label: "Commit",
    description: "git commit — pauses for human y/n confirmation before acting.",
    agentId: null,
    command: "git commit",
    flowLabel: "IMPLEMENTATION",
  },
  {
    id: "push",
    index: 6,
    label: "Push",
    description: "git push — pauses for human y/n confirmation before acting.",
    agentId: null,
    command: "git push",
    flowLabel: "IMPLEMENTATION",
  },
  {
    id: "pr",
    index: 7,
    label: "Pull Request",
    description: "gh pr create, or comments on an existing open PR for the branch — pauses for human y/n confirmation.",
    agentId: null,
    command: "gh pr create",
    flowLabel: "IMPLEMENTATION",
  },
  {
    id: "report-manager",
    index: 8,
    label: "Report",
    description: "Compiles a structured report from git history/diff.",
    agentId: "report-manager",
    command: null,
    flowLabel: "VALIDATION",
  },
  {
    id: "security",
    index: 9,
    label: "Security Review",
    description: "senior-security-engineer reviews the diff for OWASP risks. A FAIL aborts.",
    agentId: "senior-security-engineer",
    command: null,
    flowLabel: "VALIDATION",
  },
];

/**
 * Chapter 06 — "AI ENGINEERING PLAYGROUND" hero/entry copy, shared verbatim
 * between `GameSection`'s always-visible heading and `PlaygroundEntry`'s
 * cinematic entry chapter so both describe the same experience identically.
 */
export const playgroundHeroCopy = {
  title: "AI Engineering Playground",
  description: "Explore how intelligent systems are built, tested, reviewed, and connected.",
  cta: "Play experience",
} as const;

/**
 * Chapter 06 — "AI ENGINEERING PLAYGROUND". Four cohesive experiences that
 * visualise this repo's real AI agents (`AGENTS` above) and real
 * `ai_workflow.sh` pipeline (`WORKFLOW_STAGES` above) — real project data,
 * not invented game mechanics, so no /docs sourcing is needed beyond
 * `.claude/agents/*.md` and `scripts/ai_workflow.sh` themselves. Each
 * `accentHex` also drives that experience's own glow and the shared ambience
 * particle field behind the whole chapter (see
 * three/scenes/GameAmbienceScene.tsx + lib/motion/playgroundState.ts).
 */
export const playgroundExperiences: PlaygroundExperienceDefinition[] = [
  {
    id: "choose-agent",
    index: 1,
    title: "Choose Your AI Agent",
    tagline: "Select the specialist for the job.",
    description:
      "Meet the 4 real AI agents behind this repo's own pipeline — select one to see its real responsibility and where it fits the workflow.",
    accentHex: "#fd6a50",
  },
  {
    id: "run-workflow",
    index: 2,
    title: "Run the AI Workflow",
    tagline: "A request becomes a pipeline run.",
    description:
      "Start the real 9-stage ai_workflow.sh pipeline and watch each stage execute, from implementation through to security review.",
    accentHex: "#22d3ee",
  },
  {
    id: "build-test",
    index: 3,
    title: "Build & Test",
    tagline: "Inside a real dev workstation.",
    description:
      "Watch code, terminal, and test output move through the same analyze → implement → test → fix → verify loop the build stage runs for real.",
    accentHex: "#a78bfa",
  },
  {
    id: "review-ship",
    index: 4,
    title: "Review & Ship",
    tagline: "From reviewed diff to shippable PR.",
    description:
      "Watch security review and reporting close the loop as the workflow reaches implemented, tested, reviewed, ready to ship.",
    accentHex: "#34d399",
  },
];

/**
 * Card-level copy for the playground's entry modules
 * (components/game/PlaygroundEntry.tsx): a short "system" label naming what
 * each experience actually is, and a concise one-line summary of the same
 * real experience its full `description` explains — no invented mechanics.
 */
export const playgroundCardMeta: Record<PlaygroundExperienceId, { system: string; summary: string }> = {
  "choose-agent": {
    system: "Agent network",
    summary: "Meet the 4 real AI agents behind this site's pipeline and pick the right specialist for the task.",
  },
  "run-workflow": {
    system: "Workflow engine",
    summary: "Start the real 9-stage ai_workflow.sh pipeline and watch every stage execute.",
  },
  "build-test": {
    system: "Build system",
    summary: "Follow code, terminal and tests through the analyze → fix → verify loop.",
  },
  "review-ship": {
    system: "Release gate",
    summary: "Close the loop with security review and reporting — from diff to shippable PR.",
  },
};

/**
 * Chapter 07 — Cinematic AI Future. The three delivery capabilities
 * (src/data/capabilities.ts) reframed as forward-looking vision pillars —
 * same real facts, future-facing narration.
 */
export const visionPillars: VisionPillar[] = capabilities.map((capability) => ({
  title: capability.title,
  description: capability.summary,
}));
