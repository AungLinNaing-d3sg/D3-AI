import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AiPlayground } from "@/components/game/AiPlayground";

/**
 * Chapter 06 — The AI Engineering Playground. A colour-reactive particle
 * drift (see three/scenes/GameAmbienceScene.tsx) sits behind 4 cohesive
 * experiences (components/game/AiPlayground.tsx) that visualise this repo's
 * own real AI development pipeline — the 4 subagents in `.claude/agents/*.md`
 * and the 9-stage `scripts/ai_workflow.sh` — with explicit Start/Run/Skip/
 * Back controls at every step, so the journey never forces interaction to
 * continue and no one is ever trapped in an experience.
 */
export function GameSection() {
  return (
    <Section
      stageId="game"
      ariaLabelledBy="game-heading"
      className="min-h-[80vh] md:min-h-[95vh] lg:min-h-[105vh]"
    >
      {/* Pinned only from tablet up — on mobile the playground menu/games
          flow normally instead of being held in a full-screen pin.
          `md:min-h-[100svh]` (not a fixed `h-[100svh]`) on tablet/desktop
          too, since the playground menu/games can genuinely exceed one
          viewport of content — a fixed height would let that overflow
          clip/overlap the next chapter and shortchange this stage's own
          scroll distance, which is what let the page reach the Future/CTA
          chapters' scroll range before this one's content had actually
          finished. `min-h` lets the section grow to fit real content while
          still pinning for the rest. */}
      <div className="relative flex h-auto flex-col items-center justify-center gap-6 py-8 md:sticky md:top-0 md:min-h-[100svh] md:gap-6 md:py-10 lg:py-12">
        <Container className="flex flex-col items-center gap-8">
          <SectionHeading
            headingId="game-heading"
            eyebrow="06 — Optional · interactive"
            title="AI Engineering Playground"
            description="See the real AI agents and workflow this repository runs on itself — pick any experience below, or step through them all."
            align="center"
            scrim
          />
          <AiPlayground />
        </Container>
      </div>
    </Section>
  );
}
