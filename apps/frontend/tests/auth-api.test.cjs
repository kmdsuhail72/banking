const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function client(fetch) {
  const events = [];
  const writes = [];
  const source = fs.readFileSync(
    path.join(__dirname, "../src/lib/api.ts"),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const context = {
    exports: {},
    process: { env: {} },
    fetch,
    Event,
    localStorage: {
      removeItem() {},
      setItem(...args) {
        writes.push(args);
      },
    },
    window: {
      dispatchEvent(event) {
        events.push(event.type);
      },
    },
    require() {
      return { DEMO_TOKEN: "__demo__", handleDemoApi: () => undefined };
    },
  };
  vm.runInNewContext(compiled, context);
  return { ...context.exports, events, writes };
}
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

test("access tokens remain in memory", () => {
  const auth = client(() => {});
  auth.setAccessToken("sensitive-token");
  assert.equal(auth.getAccessToken(), "sensitive-token");
  assert.deepEqual(auth.writes, []);
  auth.setAccessToken(null);
  assert.equal(auth.getAccessToken(), null);
});
test("concurrent expired requests share one refresh and retry with the new token", async () => {
  let refreshes = 0;
  const auth = client(async (url, options) => {
    if (url.endsWith("/auth/refresh")) {
      refreshes++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(options.credentials, "include");
      return json({ accessToken: "new" });
    }
    return options.headers.Authorization === "Bearer new"
      ? json({ ok: true })
      : json({ message: "Expired" }, 401);
  });
  auth.setAccessToken("old");
  const results = await Promise.all([
    auth.api("/api/v1/accounts"),
    auth.api("/api/v1/transactions"),
  ]);
  assert.equal(refreshes, 1);
  assert.ok(results.every((r) => r.ok));
});
test("failed refresh clears the token and announces expiration", async () => {
  const auth = client(async () => json({ message: "Expired" }, 401));
  auth.setAccessToken("old");
  await assert.rejects(auth.api("/api/v1/accounts"));
  assert.equal(auth.getAccessToken(), null);
  assert.deepEqual(auth.events, ["auth:expired"]);
});
test("login failures never trigger refresh", async () => {
  let calls = 0;
  const auth = client(async () => {
    calls++;
    return json({ message: "Invalid credentials" }, 401);
  });
  await assert.rejects(auth.api("/api/v1/auth/login", { method: "POST" }));
  assert.equal(calls, 1);
});
test("a retried request is never retried a second time", async () => {
  let requests = 0;
  const auth = client(async (url) => {
    if (url.endsWith("/auth/refresh")) return json({ accessToken: "new" });
    requests++;
    return json({ message: "Denied" }, 401);
  });
  await assert.rejects(auth.api("/api/v1/accounts"));
  assert.equal(requests, 2);
  assert.equal(auth.getAccessToken(), null);
  assert.deepEqual(auth.events, ["auth:expired"]);
});
