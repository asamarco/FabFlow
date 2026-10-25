import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { emptyFlow, recompute } from "./stack";
import { exportSteps, substrateStep } from "./presentation";

describe("substrate presentation", () => {
  test("substrate is hidden from export by default, including older flows", () => {
    const flow = emptyFlow();
    assert.equal(substrateStep(flow).hidden, true);
    assert.equal(exportSteps(flow).length, 0);
  });

  test("explicitly visible substrate exports before process steps without becoming a transform", () => {
    const flow = recompute({ ...emptyFlow(), substrateHidden: false, steps: [{ id: "step-1", category: "deposition", description: "", stackTransform: { kind: "noChange" }, stackAfter: [] }] });
    assert.deepEqual(exportSteps(flow).map((step) => step.id), ["substrate-card", "step-1"]);
    assert.equal(flow.steps.length, 1);
    assert.deepEqual(flow.steps[0]?.stackAfter, [flow.substrate]);
  });
});