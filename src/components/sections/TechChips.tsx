"use client";

import { useEffect } from "react";
import { technologyNetworkNodes } from "@/data/journey";
import { networkFocus } from "@/lib/motion/networkFocus";

/**
 * How We Build's technology tags. Hovering a tag lights the matching node in the 3D network behind the section
 * (`networkFocus`, read by three/scenes/NeuralScene.tsx). The tags stay the
 * accessible list of every node the graph shows (the link is a visual
 * extra, so the tags stay plain text rather than empty tab stops).
 */
export function TechChips() {
  useEffect(
    () => () => {
      networkFocus.id = null;
    },
    []
  );

  const point = (id: string | null) => () => {
    networkFocus.id = id;
  };

  return (
    <>
      {technologyNetworkNodes.map((node) => (
        <span
          key={node.id}
          className="build-chip glass-card"
          onPointerEnter={point(node.id)}
          onPointerLeave={point(null)}
        >
          <span className="card-edge" aria-hidden="true" />
          {node.label}
        </span>
      ))}
    </>
  );
}
