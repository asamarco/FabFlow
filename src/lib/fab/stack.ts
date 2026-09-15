import type { Layer, ProcessFlow, ProcessStep, StackTransform } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10);

export const DEFAULT_SUBSTRATE: Layer = {
  id: "substrate",
  material: "Substrate (BSG)",
  color: "#8a8f98",
  thickness: 60,
  patterned: false,
  pattern: { kind: "none" },
};

export function applyTransform(stack: Layer[], t: StackTransform, stepId = uid()): Layer[] {
  switch (t.kind) {
    case "noChange":
      return stack.map((l) => ({ ...l }));
    case "addLayer": {
      const added = { ...t.layer, id: `layer-${stepId}` };
      const rest = stack.map((l) => ({ ...l }));
      return t.position === "bottom" ? [added, ...rest] : [...rest, added];
    }
    case "removeLayer":
      return stack.filter((l) => l.id !== t.layerId).map((l) => ({ ...l }));
    case "modifyLayer":
      return stack.map((l) => (l.id === t.layerId ? { ...l, ...t.changes } : { ...l }));
    case "recolorLayer":
      return stack.map((l) => (l.id === t.layerId ? { ...l, color: t.color } : { ...l }));
    default:
      return stack;
  }
}

/** Recompute stackAfter for every step, cascading from the substrate. */
export function recompute(flow: ProcessFlow): ProcessFlow {
  let current: Layer[] = [{ ...flow.substrate }];
  const steps: ProcessStep[] = flow.steps.map((s) => {
    current = applyTransform(current, s.stackTransform, s.id);
    return { ...s, stackAfter: current.map((l) => ({ ...l })) };
  });
  return { ...flow, steps };
}

export function stackBefore(flow: ProcessFlow, index: number): Layer[] {
  if (index <= 0) return [{ ...flow.substrate }];
  return flow.steps[index - 1]?.stackAfter ?? [{ ...flow.substrate }];
}

export function emptyFlow(name = "Untitled process flow"): ProcessFlow {
  return { id: uid(), name, substrate: { ...DEFAULT_SUBSTRATE }, steps: [] };
}
