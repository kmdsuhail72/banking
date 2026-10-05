const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createEdge, token } = require("../lab/edge.cjs");
const { assess } = require("../lab/witness.cjs");
const { TARGET, profiles } = require("../lab/load.cjs");
test("read-only ingress blocks writes and arbitrary destinations", async (t) => {
  let requests = [];
  const server = createEdge(
    "test-synthetic-secret-with-at-least-32-characters",
    async (url, options) => {
      requests.push({ url, options });
      return {
        status: 200,
        text: async () => JSON.stringify({ balance: 50000 }),
      };
    },
  );
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => new Promise((r) => server.close(r)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const path of ["/api/transactions/transfer", "/balance"])
    assert.equal((await fetch(base + path, { method: "POST" })).status, 405);
  assert.equal(
    (await fetch(base + "/balance?url=http://production")).status,
    404,
  );
  assert.equal(requests.length, 0);
  const r = await fetch(base + "/balance");
  assert.equal(r.status, 200);
  assert.equal((await r.json()).balance, 50000);
  assert.equal(requests.length, 2);
  assert.ok(
    requests[1].url.startsWith("http://127.0.0.1:5000/api/user/balance"),
  );
  assert.equal(requests[1].options.redirect, "error");
  const metrics = await (await fetch(base + "/metrics")).text();
  assert.match(metrics, /outcome="success"} 1/);
});
test("dependency failure is technical failure and not a successful empty balance", async (t) => {
  const server = createEdge(
    "test-synthetic-secret-with-at-least-32-characters",
    async () => {
      throw Error("unavailable");
    },
  );
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => new Promise((r) => server.close(r)));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base + "/balance")).status, 503);
  assert.match(
    await (await fetch(base + "/metrics")).text(),
    /outcome="technical_failure"} 1/,
  );
});
test("integrity detects balance, transaction and dataset changes", () => {
  const users = [
    {
      _id: "000000000000000000000001",
      email: "synthetic@example.invalid",
      balance: 50000,
    },
  ];
  const original = assess(users, [], ["users", "transactions"]);
  assert.equal(original.violations, 0);
  assert.ok(
    assess([{ ...users[0], balance: 49999 }], [], ["users", "transactions"])
      .violations > 0,
  );
  assert.ok(
    assess(users, [{ amount: 1 }], ["users", "transactions"]).violations > 0,
  );
  assert.ok(
    assess(users, [], ["users", "transactions", "customers"]).violations > 0,
  );
  assert.notEqual(
    original.hash,
    assess([{ ...users[0], extra: "changed" }], [], ["users", "transactions"])
      .hash,
  );
});
test("load is fixed to lab reads and bounded to at most 2400 spike requests", () => {
  assert.equal(
    TARGET,
    "http://banking-api.banking-chaos.svc.cluster.local:8080/balance",
  );
  assert.equal(
    profiles.spike.reduce((n, [s, r]) => n + s * r, 0),
    2400,
  );
  assert.equal(
    profiles.baseline.reduce((n, [s, r]) => n + s * r, 0),
    900,
  );
});
