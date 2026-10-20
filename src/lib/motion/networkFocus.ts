/**
 * Which technology the visitor is pointing at in How We Build's stack list
 * (a `technologyNetworkNodes` id, or null) — set by
 * components/sections/TechChips.tsx on hover, read every
 * frame by the chapter's 3D network (three/scenes/NeuralScene.tsx) to light
 * that node and its link. A plain mutable object, like `journeyState`.
 */
export const networkFocus: { id: string | null } = { id: null };
