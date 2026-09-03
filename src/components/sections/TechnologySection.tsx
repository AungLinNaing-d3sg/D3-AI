import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { techNodes } from "@/data/technology";
import type { TechNode } from "@/types";

function groupByCategory(nodes: TechNode[]) {
  const groups = new Map<TechNode["category"], TechNode[]>();
  for (const node of nodes) {
    const existing = groups.get(node.category) ?? [];
    existing.push(node);
    groups.set(node.category, existing);
  }
  return Array.from(groups.entries());
}

/** Chapter 5 — Technology: the real Microsoft-centric technology ecosystem
 * (src/data/technology.ts), mirrored by the connected-node 3D graph. */
export function TechnologySection() {
  const grouped = groupByCategory(techNodes);

  return (
    <Section id="technology" ariaLabelledBy="technology-heading">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          headingId="technology-heading"
          eyebrow="Technology ecosystem"
          title="Built around Microsoft technologies"
          description="Our portfolio revolves around a connected set of Microsoft platforms and delivery practices — visualised behind this section as a live ecosystem graph."
        />

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {grouped.map(([category, nodes], groupIndex) => (
            <Reveal key={category} delay={groupIndex * 0.06} className="flex flex-col gap-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-400">
                {category}
              </h3>
              <ul className="flex flex-col gap-3">
                {nodes.map((node) => (
                  <li
                    key={node.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-ink-200"
                  >
                    {node.label}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
