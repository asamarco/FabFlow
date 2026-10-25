import type { ProcessFlow, ProcessStep } from "./types";

/** The substrate is a fixed starting state, not a reorderable process step. */
export function substrateStep(flow: ProcessFlow): ProcessStep {
  return {
    id: "substrate-card",
    category: "custom",
    customName: "Substrate",
    customIcon: "Layers",
    description: "",
    stackTransform: { kind: "noChange" },
    stackAfter: [flow.substrate],
    hidden: flow.substrateHidden !== false,
  };
}

export function exportSteps(flow: ProcessFlow): ProcessStep[] {
  const steps = flow.steps.filter((step) => !step.hidden);
  return flow.substrateHidden === false ? [substrateStep(flow), ...steps] : steps;
}