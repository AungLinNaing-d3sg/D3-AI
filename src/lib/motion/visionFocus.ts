/**
 * Which Vision pillar (0 Data, 1 Dynamics, 2 Digital, -1 none) is active
 * in Chapter 07's module stack — set from the scroll by
 * components/sections/FutureSection.tsx, read every frame by the robot
 * (three/scenes/vision/VisionRobot.tsx) to brighten that discipline's ring
 * in its hologram. A plain mutable object, like `journeyState`.
 */
export const visionFocus = { pillar: -1 };
