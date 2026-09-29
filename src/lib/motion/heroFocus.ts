/**
 * Which of the three disciplines (0 Data, 1 Dynamics, 2 Digital) the Hero
 * copy is pointing at right now — set by hovering/focusing a discipline chip
 * in components/sections/IntroSection.tsx, read every frame by the Hero's 3D
 * scene (three/scenes/IntroScene.tsx) to light that discipline's orbit. A
 * plain mutable object, like `journeyState`: no React state per hover.
 */
export const heroFocus = { discipline: -1 };

/** Orbit / chip colours, shared by the 3D scene and the copy. */
export const DISCIPLINE_COLORS = ["#67e8f9", "#ffb36b", "#b9a8ff"] as const;
