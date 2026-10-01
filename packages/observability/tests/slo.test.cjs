const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const {
  httpOutcome,
  domainOutcome,
  businessRejection,
  observeOperation,
  getServiceMetrics,
  instrumentDataSource,
  createMetrics,
  installMetrics,
} = require("../dist");
test("technical failures and explicit business rejections stay distinct", async () => {
  for (const code of [408, 429, 500, 502, 503, 504])
    assert.equal(httpOutcome(code), "technical_failure");
  for (const code of [400, 401, 403, 404, 409, 422])
    assert.equal(httpOutcome(code), "business_rejection");
  assert.equal(httpOutcome(200, true), "technical_failure");
  assert.equal(domainOutcome({ getStatus: () => 400 }), "technical_failure");
  const rejected = businessRejection(new Error("insufficient funds"));
  const failed = new Error("DB unavailable");
  assert.equal(
    await observeOperation(
      "slo-test",
      "transaction",
      "transfer",
      async () => 7,
    ),
    7,
  );
  for (const err of [rejected, failed])
    await assert.rejects(
      observeOperation("slo-test", "transaction", "transfer", async () => {
        throw err;
      }),
      (e) => e === err,
    );
  const m = await getServiceMetrics("slo-test").slo.operations.get();
  assert.deepEqual(
    m.values.map((v) => v.value),
    [1, 1, 1],
  );
});
test("close/finish counts exactly once and drains active requests", async () => {
  let middleware;
  const m = installMetrics(
    {
      use: (fn) => (middleware = fn),
      getHttpAdapter: () => ({ getInstance: () => ({ get() {} }) }),
    },
    "slo-http",
  );
  const res = new EventEmitter();
  res.statusCode = 200;
  middleware(
    { url: "/test", method: "GET", route: { path: "/test" } },
    res,
    () => {},
  );
  res.emit("close");
  res.emit("finish");
  const outcomes = await m.slo.requests.get();
  assert.equal(
    outcomes.values.find((v) => v.labels.outcome === "technical_failure").value,
    1,
  );
  assert.equal((await m.activeRequests.get()).values[0].value, 0);
  assert.equal(
    (await m.slo.latency.get()).values.find((v) =>
      v.metricName.endsWith("_count"),
    ).value,
    1,
  );
});
test("DB wrapper preserves receiver, result and exception, measures failures, never labels SQL", async () => {
  const m = createMetrics("db-test");
  const failure = new Error("secret");
  const ds = {
    createQueryRunner() {
      return {
        value: 42,
        async query(sql) {
          if (sql === "FAIL") throw failure;
          return this.value;
        },
      };
    },
  };
  instrumentDataSource(ds, m);
  instrumentDataSource(ds, m);
  const runner = ds.createQueryRunner();
  assert.equal(await runner.query("SELECT secret FROM customer"), 42);
  await assert.rejects(runner.query("FAIL"), (e) => e === failure);
  const out = await m.registry.metrics();
  assert.match(out, /operation="SELECT"/);
  assert.doesNotMatch(out, /secret|customer/);
  assert.equal((await m.dbErrors.get()).values[0].value, 1);
});
