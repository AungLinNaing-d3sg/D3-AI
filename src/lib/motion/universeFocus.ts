/**
 * Which "By the numbers" statistic is live (index, or -1 for none), worked
 * out by components/sections/NumbersSection.tsx from where the stat cards
 * actually are on screen, so the live card is always one you can see. The
 * chapter's 3D terminal (three/scenes/UniverseScene.tsx) types the same
 * statistic. A plain mutable object, like `journeyState`.
 */
export const universeFocus = { index: -1 };
