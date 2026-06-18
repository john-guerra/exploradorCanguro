import { test } from "node:test";
import assert from "node:assert/strict";
import { clampRange } from "./rangeSliderUtils.js";

test("orders reversed handles", () => {
  assert.deepEqual(clampRange([40, 10], [0, 100], 1), [10, 40]);
});

test("clamps to domain bounds", () => {
  assert.deepEqual(clampRange([-5, 200], [0, 100], 1), [0, 100]);
});

test("snaps to step", () => {
  assert.deepEqual(clampRange([12, 37], [0, 100], 5), [10, 35]);
});

test("keeps an in-range, on-step value unchanged", () => {
  assert.deepEqual(clampRange([20, 60], [0, 100], 10), [20, 60]);
});
