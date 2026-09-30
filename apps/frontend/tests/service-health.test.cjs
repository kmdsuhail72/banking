const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/service-health.ts'), 'utf8');
function load(fetch) {
  const context = {
    exports: {}, fetch, performance, AbortSignal, Error,
    process: { env: {} },
    require: () => ({ MICROSERVICES: [
      { id: 'auth', httpPort: 4001 }, { id: 'customer', httpPort: 4002 },
    ] }),
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return context.exports.checkServices;
}
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
test('uses fixed health targets, uncached requests and reports measured uptime', async () => {
  const urls = [];
  const result = await load(async (url, options) => {
    urls.push(url);
    assert.equal(options.cache, 'no-store');
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal);
    return json({ status: 'ok', uptimeSeconds: 123 });
  })();
  assert.deepEqual(urls, ['http://127.0.0.1:4001/health', 'http://127.0.0.1:4002/health']);
  assert.ok(Date.parse(result.checkedAt));
  for (const service of result.services) {
    assert.equal(service.status, 'healthy');
    assert.equal(service.uptimeSeconds, 123);
    assert.ok(service.latencyMs >= 0);
  }
});
test('one failed service does not hide healthy services', async () => {
  const result = await load(async url => {
    if (url.includes('4001')) throw new Error('connection refused');
    return json({ status: 'ok' });
  })();
  assert.equal(result.services[0].status, 'offline');
  assert.equal(result.services[0].latencyMs, null);
  assert.equal(result.services[1].status, 'healthy');
  assert.equal(result.services[1].uptimeSeconds, null);
});
test('non-OK status, HTTP errors and malformed JSON are degraded', async () => {
  for (const response of [() => json({ status: 'error' }), () => json({ status: 'ok' }, 503), () => new Response('invalid')]) {
    const result = await load(async () => response())();
    assert.equal(result.services[0].status, 'degraded');
  }
});
test('timeouts report offline without exposing exception details', async () => {
  const result = await load(async () => { const error = new Error('private host'); error.name = 'TimeoutError'; throw error; })();
  assert.equal(result.services[0].status, 'offline');
  assert.equal(result.services[0].detail, 'Health check timed out after 2.5s');
});
