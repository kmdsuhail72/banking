import { test } from "node:test";
import assert from "node:assert/strict";
import { decision, expected } from "./budget-gate.mjs";
test("deployment gate fails closed for absent, stale, NaN, exhausted and low budgets", () => {
  const rows = expected.map(([service, slo]) => ({
    metric: { service, slo },
    value: [1000, "0.8"],
  }));
  assert.equal(decision(rows, 1000).state, "NORMAL");
  assert.equal(decision(rows.slice(1), 1000).state, "UNKNOWN");
  assert.equal(decision(rows, 1100).state, "UNKNOWN");
  rows[0].value[1] = "NaN";
  assert.equal(decision(rows, 1000).state, "UNKNOWN");
  rows[0].value[1] = "-0.2";
  assert.equal(decision(rows, 1000).state, "FREEZE");
  rows[0].value[1] = "0.2";
  assert.equal(decision(rows, 1000).state, "SLOW");
});
