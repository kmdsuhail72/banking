const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const {
  createMetrics,
  installMetrics,
  interceptGrpc,
  startTelemetry,
  shutdownTelemetry,
  getTraceContext,
} = require("../dist");

test("registries are isolated by service and expose process metrics", async () => {
  const a = createMetrics("a");
  const b = createMetrics("b");
  a.requests.inc({ method: "GET", route: "/accounts/:id", status_code: "200" });
  const counter = (await a.registry.getMetricsAsJSON()).find(
    (metric) => metric.name === "banking_http_requests_total",
  );
  assert.equal(counter.values[0].value, 1);
  assert.equal(counter.values[0].labels.service, "a");
  assert.equal(counter.values[0].labels.route, "/accounts/:id");
  assert.doesNotMatch(await b.registry.metrics(), /service="a"/);
  assert.match(await b.registry.metrics(), /banking_process_cpu/);
});

test("HTTP metrics record route templates and exclude health probes", async () => {
  let middleware;
  const metrics = installMetrics(
    {
      use: (fn) => {
        middleware = fn;
      },
      getHttpAdapter: () => ({ getInstance: () => ({ get() {} }) }),
    },
    "test",
  );
  const response = new EventEmitter();
  response.statusCode = 200;
  middleware(
    {
      url: "/accounts/secret-customer-id?token=secret",
      method: "GET",
      route: { path: "/accounts/:id" },
    },
    response,
    () => {},
  );
  response.emit("finish");
  const probe = new EventEmitter();
  probe.statusCode = 200;
  middleware({ url: "/health", method: "GET" }, probe, () => {});
  probe.emit("finish");
  const output = await metrics.registry.metrics();
  assert.match(output, /route="\/accounts\/:id"/);
  assert.doesNotMatch(output, /secret-customer|token=|route="\/health"/);
});

test("gRPC interceptor preserves values and errors and counts each completed call", async () => {
  const metrics = createMetrics("grpc");
  assert.equal(
    await interceptGrpc(metrics, "/banking.Account/Get", async () => 42),
    42,
  );
  const failure = Object.assign(new Error("denied"), { code: 7 });
  await assert.rejects(
    interceptGrpc(metrics, "/banking.Account/Get", () => {
      throw failure;
    }),
    (error) => error === failure,
  );
  const output = await metrics.registry.metrics();
  assert.match(output, /status_code="0"/);
  assert.match(output, /status_code="7"/);
  assert.doesNotMatch(output, /denied/);
});

test("real grpc-js calls preserve distributed context and flush OTLP spans", async () => {
  const http = require("node:http");
  const payloads = [];
  const collector = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      payloads.push(Buffer.concat(chunks).toString());
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end("{}");
    });
  });
  await new Promise((resolve) => collector.listen(0, "127.0.0.1", resolve));
  process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = `http://127.0.0.1:${collector.address().port}/v1/traces`;
  startTelemetry("grpc-integration");
  const grpc = require("@grpc/grpc-js");
  const { trace } = require("@opentelemetry/api");
  const encode = (value) => Buffer.from(JSON.stringify(value));
  const decode = (value) => JSON.parse(value.toString());
  const definition = {
    ping: {
      path: "/banking.Test/Ping",
      requestStream: false,
      responseStream: false,
      requestSerialize: encode,
      requestDeserialize: decode,
      responseSerialize: encode,
      responseDeserialize: decode,
    },
  };
  const server = new grpc.Server();
  let serverTrace;
  server.addService(definition, {
    ping(call, callback) {
      serverTrace = getTraceContext().traceId;
      callback(null, { ok: true });
    },
  });
  let client;
  try {
    const port = await new Promise((resolve, reject) =>
      server.bindAsync(
        "127.0.0.1:0",
        grpc.ServerCredentials.createInsecure(),
        (error, port) => (error ? reject(error) : resolve(port)),
      ),
    );
    const Client = grpc.makeGenericClientConstructor(definition, "Test");
    client = new Client(`127.0.0.1:${port}`, grpc.credentials.createInsecure());
    await trace
      .getTracer("test")
      .startActiveSpan("grpc-parent", async (span) => {
        try {
          const result = await new Promise((resolve, reject) =>
            client.ping({}, (error, value) =>
              error ? reject(error) : resolve(value),
            ),
          );
          assert.equal(result.ok, true);
          assert.equal(serverTrace, span.spanContext().traceId);
        } finally {
          span.end();
        }
      });
  } finally {
    client?.close();
    await new Promise((resolve) => server.tryShutdown(resolve));
    await shutdownTelemetry();
    await new Promise((resolve) => collector.close(resolve));
  }
  assert.ok(
    payloads.some((payload) => payload.includes("grpc-parent")),
    "SDK flush must deliver trace data over OTLP",
  );
});
