/* Every phase is bounded, read-only and hardwired to the isolated lab service. */
const fs = require("node:fs");
const TARGET =
  "http://banking-api.banking-chaos.svc.cluster.local:8080/balance";
const profiles = {
  baseline: [[180, 5]],
  spike: [
    [15, 5],
    [45, 50],
    [15, 5],
  ],
};
async function run(profile = "baseline", request = fetch) {
  if (!profiles[profile]) throw Error("Unknown load profile");
  let total = 0,
    failed = 0,
    inflight = 0,
    dropped = 0;
  const latencies = [];
  const tasks = new Set();
  for (const [seconds, rate] of profiles[profile]) {
    const end = Date.now() + seconds * 1000;
    while (Date.now() < end) {
      if (inflight < 20 && total < 2500) {
        inflight++;
        total++;
        const start = performance.now();
        const task = request(TARGET, {
          method: "GET",
          redirect: "error",
          signal: AbortSignal.timeout(2000),
        })
          .then(async (r) => {
            await r.text();
            if (r.status !== 200) failed++;
          })
          .catch(() => failed++)
          .finally(() => {
            latencies.push((performance.now() - start) / 1000);
            inflight--;
            tasks.delete(task);
          });
        tasks.add(task);
      } else dropped++;
      await new Promise((r) => setTimeout(r, 1000 / rate));
    }
  }
  await Promise.all(tasks);
  latencies.sort((a, b) => a - b);
  return {
    profile,
    total,
    failed,
    dropped,
    p95: latencies[Math.floor(latencies.length * 0.95)] || 0,
    p99: latencies[Math.floor(latencies.length * 0.99)] || 0,
    readOnly: true,
  };
}
module.exports = { TARGET, profiles, run };
if (require.main === module)
  run(process.argv[2] || "baseline")
    .then((result) => {
      console.log(JSON.stringify(result));
      fs.writeFileSync("/dev/termination-log", JSON.stringify(result));
      if (
        result.failed / Math.max(result.total, 1) > 0.1 ||
        result.dropped > 0 ||
        result.p99 > 2
      )
        process.exitCode = 1;
    })
    .catch(() => (process.exitCode = 1));
