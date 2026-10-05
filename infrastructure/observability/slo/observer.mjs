import { createServer } from "node:http";
import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const buckets = [30, 60, 120, 300, 600, 900, 1800, 3600];
export function sample(state, good, now) {
  state.total++;
  state.good += Number(good);
  state.last = now;
  if (!good) {
    state.since ??= now;
    state.streak = 0;
  } else if (state.since !== null && ++state.streak >= 3) {
    const seconds = now - state.since;
    state.recoveries++;
    state.sum += seconds;
    buckets.forEach((b, i) => {
      if (seconds <= b) state.buckets[i]++;
    });
    state.since = null;
    state.streak = 0;
  }
  return state;
}
export function initial() {
  return {
    total: 0,
    good: 0,
    last: 0,
    since: null,
    streak: 0,
    recoveries: 0,
    sum: 0,
    buckets: buckets.map(() => 0),
  };
}
export function exposition(states, now) {
  const lines = [];
  for (const [service, s] of Object.entries(states)) {
    const label = `service="${service}"`;
    for (const [name, value] of Object.entries({
      banking_sli_probe_total: s.total,
      banking_sli_probe_good_total: s.good,
      banking_sli_probe_last_timestamp_seconds: s.last,
      banking_sli_outage_age_seconds: s.since === null ? 0 : now - s.since,
      banking_sli_recovery_seconds_count: s.recoveries,
      banking_sli_recovery_seconds_sum: s.sum,
    }))
      lines.push(`${name}{${label}} ${value}`);
    buckets.forEach((b, i) =>
      lines.push(
        `banking_sli_recovery_seconds_bucket{${label},le="${b}"} ${s.buckets[i]}`,
      ),
    );
    lines.push(
      `banking_sli_recovery_seconds_bucket{${label},le="+Inf"} ${s.recoveries}`,
    );
  }
  return lines.join("\n") + "\n";
}
async function main() {
  const config = JSON.parse(
    readFileSync(process.env.PROBE_CONFIG || "/config/probes.json", "utf8"),
  );
  if (
    !config.length ||
    config.some((p) => !/^[a-z][a-z0-9_-]*$/.test(p.service)) ||
    new Set(config.map((p) => p.service)).size !== config.length
  )
    throw Error("Unique bounded service labels required");
  const file = process.env.PROBE_STATE || "/data/state.json";
  const saved = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const states = Object.fromEntries(
    config.map((p) => [p.service, saved[p.service] || initial()]),
  );
  createServer((req, res) => {
    if (req.url !== "/metrics") {
      res.writeHead(404);
      res.end();
      return;
    }
    res.setHeader("Content-Type", "text/plain; version=0.0.4");
    res.end(exposition(states, Date.now() / 1000));
  }).listen(Number(process.env.PORT || 9105), "0.0.0.0");
  async function tick() {
    await Promise.all(
      config.map(async (p) => {
        let good = false;
        try {
          const token = process.env[p.tokenEnv || "SLO_PROBE_TOKEN"];
          const response = await fetch(p.url, {
            redirect: "error",
            signal: AbortSignal.timeout(5000),
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const body = await response.text();
          good =
            response.status === 200 &&
            (!p.bodyIncludes || body.includes(p.bodyIncludes));
        } catch {
          /* Connection failures and deadlines are bad samples. */
        }
        sample(states[p.service], good, Date.now() / 1000);
      }),
    );
    writeFileSync(file + ".tmp", JSON.stringify(states));
    renameSync(file + ".tmp", file);
  }
  // No overlapping probes; completion cadence is about 10-15 seconds.
  while (true) {
    await tick();
    await new Promise((r) => setTimeout(r, 10000));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch(() => {
    console.error(
      "SLO observer failed; inspect configuration/state permissions",
    );
    process.exitCode = 1;
  });
