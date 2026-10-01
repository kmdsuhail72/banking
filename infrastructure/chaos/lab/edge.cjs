/* Read-only chaos ingress. There is deliberately no arbitrary proxy route. */
const http = require("node:http");
const crypto = require("node:crypto");
const buckets = [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5];
function token(secret) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const value =
    encode({ alg: "HS256", typ: "JWT" }) +
    "." +
    encode({
      id: "000000000000000000000001",
      exp: Math.floor(Date.now() / 1000) + 60,
    });
  return (
    value +
    "." +
    crypto.createHmac("sha256", secret).update(value).digest("base64url")
  );
}
function createEdge(secret, request = fetch) {
  if (!secret || secret.length < 32) throw Error("Lab-only JWT key required");
  const counts = { success: 0, technical_failure: 0 };
  const histogram = buckets.map(() => 0);
  let sum = 0;
  return http.createServer(async (req, res) => {
    if (req.method !== "GET") {
      res.writeHead(405);
      res.end("Read-only lab");
      return;
    }
    if (req.url === "/health/live") {
      res.end("ok");
      return;
    }
    if (req.url === "/metrics") {
      const count = counts.success + counts.technical_failure;
      const lines = Object.entries(counts).map(
        ([outcome, value]) =>
          `banking_chaos_http_requests_total{outcome="${outcome}"} ${value}`,
      );
      buckets.forEach((b, i) =>
        lines.push(
          `banking_chaos_http_duration_seconds_bucket{le="${b}"} ${histogram[i]}`,
        ),
      );
      lines.push(
        `banking_chaos_http_duration_seconds_bucket{le="+Inf"} ${count}`,
        `banking_chaos_http_duration_seconds_count ${count}`,
        `banking_chaos_http_duration_seconds_sum ${sum}`,
      );
      res.setHeader("Content-Type", "text/plain; version=0.0.4");
      res.end(lines.join("\n") + "\n");
      return;
    }
    const path = {
      "/balance": "/api/user/balance",
      "/transactions": "/api/transactions",
      "/health/ready": "/api/user/balance",
    }[req.url];
    if (!path) {
      res.writeHead(404);
      res.end();
      return;
    }
    const start = performance.now();
    let success = false;
    try {
      const dependency = await request(
        "http://dependency-stub.banking-chaos.svc.cluster.local:8081/status",
        { signal: AbortSignal.timeout(500), redirect: "error" },
      );
      await dependency.text();
      if (dependency.status !== 200) throw Error("Dependency unavailable");
      const response = await request("http://127.0.0.1:5000" + path, {
        headers: { Authorization: "Bearer " + token(secret) },
        signal: AbortSignal.timeout(1000),
        redirect: "error",
      });
      const body = await response.text();
      success = response.status === 200;
      res.writeHead(success ? 200 : 503, {
        "Content-Type": "application/json",
      });
      res.end(
        success
          ? body
          : JSON.stringify({ error: "Synthetic backend unavailable" }),
      );
    } catch {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Synthetic dependency unavailable" }));
    } finally {
      if (req.url !== "/health/ready") {
        const seconds = (performance.now() - start) / 1000;
        counts[success ? "success" : "technical_failure"]++;
        sum += seconds;
        buckets.forEach((b, i) => {
          if (seconds <= b) histogram[i]++;
        });
      }
    }
  });
}
module.exports = { createEdge, token };
if (require.main === module)
  createEdge(process.env.JWT_SECRET).listen(8080, "0.0.0.0");
