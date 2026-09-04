import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TrainYourAI } from "@/components/game/TrainYourAI";

/**
 * Chapter 07 — Interactive AI Mini-Game. A soft amber particle drift (see
 * three/scenes/GameAmbienceScene.tsx) sits behind a real, accessible
 * DOM/canvas-free game (components/game/TrainYourAI.tsx) with an explicit
 * Play/Skip choice, so the journey never forces interaction to continue.
 */
export function GameSection() {
  return (
    <Section stageId="game" ariaLabelledBy="game-heading" className="min-h-[130vh]">
      <div className="sticky top-0 flex h-[100svh] flex-col items-center justify-center gap-10 py-16">
        <Container className="flex flex-col items-center gap-10">
          <SectionHeading
            headingId="game-heading"
            eyebrow="07 — Optional · interactive"
            title="Train your AI"
            align="center"
          />
          <TrainYourAI />
        </Container>
      </div>
    </Section>
  );
}
