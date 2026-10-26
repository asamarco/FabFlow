import { test } from "node:test";
import assert from "node:assert/strict";
import { clampHoleShift, partialCoverRange } from "./pattern";

test("hole group shift is clamped so openings stay on the wafer", () => {
  // 1 opening of 50% pitch: room = 0.5 - 0.25 = 0.25
  assert.equal(clampHoleShift(1, 0.5, 0.4), 0.25);
  assert.equal(clampHoleShift(1, 0.5, -0.4), -0.25);
  assert.equal(clampHoleShift(1, 0.5, 0.1), 0.1);
});

test("partial cover strip is shifted and clamped within the wafer", () => {
  assert.deepEqual(partialCoverRange(0.5, 0.2), [0.2, 0.7]);
  assert.deepEqual(partialCoverRange(0.5, 0.9), [0.5, 1]);
});
