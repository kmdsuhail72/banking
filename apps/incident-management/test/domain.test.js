import { test } from "node:test";
import assert from "node:assert/strict";
import { manual, update, alertOccurrence, Problem } from "../server/domain.js";
const origin = "http://localhost:3001";
test("state transitions, ownership and close requirements", () => {
  const doc = manual(
    { title: "Outage", service: "ledger", severity: "SEV-1" },
    "alice",
    origin,
  );
  assert.throws(
    () => update(doc, { version: 0, status: "RESOLVED" }, "alice", ["alice"]),
    Problem,
  );
  assert.throws(
    () =>
      update(doc, { version: 0, status: "INVESTIGATING" }, "alice", ["alice"]),
    /owner/,
  );
  const { patch } = update(
    doc,
    { version: 0, status: "INVESTIGATING", owner: "alice" },
    "alice",
    ["alice"],
  );
  assert.equal(patch.status, "INVESTIGATING");
  assert.throws(
    () => update(doc, { version: 1, title: "Lost update" }, "alice", ["alice"]),
    /changed/,
  );
  doc.status = "RESOLVED";
  doc.owner = "alice";
  assert.throws(
    () => update(doc, { version: 0, status: "CLOSED" }, "alice", ["alice"]),
    /postmortem/,
  );
  assert.equal(
    update(
      doc,
      {
        version: 0,
        status: "CLOSED",
        rootCause: "Dependency saturation",
        postmortem: "Add capacity and test failover",
      },
      "alice",
      ["alice"],
    ).patch.status,
    "CLOSED",
  );
});
test("dedup keys include labels and start time; untrusted dashboard links ignored", () => {
  const a = {
    status: "firing",
    startsAt: "2026-01-01T00:00:00Z",
    labels: { alertname: "Down", service: "ledger", severity: "critical" },
    annotations: { dashboard_url: "javascript:alert(1)" },
  };
  const first = alertOccurrence(a, origin);
  assert.match(first.dashboardUrl, /^http:\/\/localhost:3001\/d\/banking-slo/);
  assert.equal(
    first.occurrenceKey,
    alertOccurrence(
      {
        ...a,
        labels: { severity: "critical", service: "ledger", alertname: "Down" },
      },
      origin,
    ).occurrenceKey,
  );
  assert.notEqual(
    first.occurrenceKey,
    alertOccurrence({ ...a, startsAt: "2026-01-02T00:00:00Z" }, origin)
      .occurrenceKey,
  );
  assert.throws(
    () =>
      alertOccurrence(
        { ...a, status: "resolved", endsAt: "2025-01-01" },
        origin,
      ),
    /endsAt/,
  );
});
