import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AiPlayground } from "@/components/game/AiPlayground";

/**
 * Chapter 07 — The AI Playground. A colour-reactive particle drift (see
 * three/scenes/GameAmbienceScene.tsx) sits behind 4 cohesive interactive
 * experiences (components/game/AiPlayground.tsx: Train Your AI + 3 new
 * self-contained 3D mini-games) with explicit Play/Replay/Skip controls at
 * every step, so the journey never forces interaction to continue and no
 * player is ever trapped in a game.
 */
export function GameSection() {
  return (
    <Section
      stageId="game"
      ariaLabelledBy="game-heading"
      className="min-h-[80vh] md:min-h-[95vh] lg:min-h-[105vh]"
    >
      {/* Pinned only from tablet up — on mobile the playground menu/games
          (which can genuinely exceed one viewport of content) flow normally
          instead of being clipped inside a fixed-height pin. */}
      <div className="relative flex h-auto flex-col items-center justify-center gap-6 py-8 md:sticky md:top-0 md:h-[100svh] md:gap-6 md:py-10 lg:py-12">
        <Container className="flex flex-col items-center gap-8">
          <SectionHeading
            headingId="game-heading"
            eyebrow="07 — Optional · interactive"
            title="The AI Playground"
            description="Four hands-on ways to see how an AI tells signal from noise — pick any experience below, or play them all."
            align="center"
          />
          <AiPlayground />
        </Container>
      </div>
    </Section>
  );
}
