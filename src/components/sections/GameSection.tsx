"use client";

import { useCallback, useState } from "react";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AiPlayground } from "@/components/game/AiPlayground";
import { playgroundHeroCopy } from "@/data/journey";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import { useWebglSupported } from "@/hooks/useWebglSupported";

/**
 * Chapter 06 — The AI Engineering Playground: one connected pipeline (entry
 * hero → Agent Network → Workflow Engine → Build & Test → Review & Ship, see
 * components/game/AiPlayground.tsx) visualising this repo's own real AI
 * development pipeline — the 4 subagents in `.claude/agents/*.md` and the
 * 9-stage `scripts/ai_workflow.sh` — with explicit Start/Run/Skip/Back
 * controls at every step, so the journey never forces interaction to
 * continue and no one is ever trapped in an experience.
 *
 * This chapter's sticky-pin only reserves a small, fixed height budget (see
 * the `min-h` note below), so once the visitor is inside a chapter (past the
 * entry hero) the always-visible description line is dropped — freeing space
 * for that chapter's own eyebrow/heading and content to stay within budget
 * without the page's scroll needing to travel far enough to escape the pin
 * into chapter 07.
 */
/**
 * Chapter 06's environment when the shared 3D canvas isn't running (reduced
 * motion, or no WebGL): the same studio lighting as the live background —
 * graphite foundation, burnt-orange light left/back, cyan light right/back,
 * violet depth above — as a static, decorative layer. With the live canvas
 * the environment is rendered there instead (three/scenes/GameAmbienceScene.tsx).
 */
function GameStaticStudio() {
  const { enableScene } = useDeviceCapability();
  const webglSupported = useWebglSupported();
  if (enableScene && webglSupported) return null;
  return <div aria-hidden="true" className="game-static-studio pointer-events-none absolute inset-0 -z-10" />;
}

export function GameSection() {
  const [isEntry, setIsEntry] = useState(true);
  const handleEntryChange = useCallback((entry: boolean) => setIsEntry(entry), []);

  return (
    <Section
      stageId="game"
      ariaLabelledBy="game-heading"
      className="min-h-[80vh] md:min-h-[95vh] lg:min-h-[105vh]"
    >
      <GameStaticStudio />
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
      <div
        className={`relative flex h-auto flex-col items-center justify-center gap-4 py-6 md:sticky md:top-0 md:min-h-[100svh] md:gap-4 ${isEntry ? "md:py-10 lg:py-12" : "md:py-6 lg:py-6"}`}
      >
        {/* `data-game-content`: the UI the background environment stays
            soft behind (see three/scenes/GameAmbienceScene.tsx). */}
        <Container data-game-content className="flex flex-col items-center gap-4">
          <SectionHeading
            headingId="game-heading"
            eyebrow="06 — AI Playground"
            title={playgroundHeroCopy.title}
            description={isEntry ? playgroundHeroCopy.description : undefined}
            align="center"
            scrim
          />
          <AiPlayground onEntryChange={handleEntryChange} />
        </Container>
      </div>
    </Section>
  );
}
