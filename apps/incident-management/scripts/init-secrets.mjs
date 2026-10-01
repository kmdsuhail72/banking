import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
const dir = resolve(process.argv[2] || ".local/incidents");
mkdirSync(dir, { recursive: true, mode: 0o700 });
for (const file of ["operators.json", "webhook-token", "metrics-token"])
  if (existsSync(resolve(dir, file)))
    throw Error("Secrets already exist; refusing to overwrite");
const token = () => randomBytes(32).toString("hex");
writeFileSync(
  resolve(dir, "operators.json"),
  JSON.stringify(
    [{ name: "sre-admin", role: "operator", token: token() }],
    null,
    2,
  ),
  { mode: 0o600 },
);
writeFileSync(resolve(dir, "webhook-token"), token(), { mode: 0o600 });
writeFileSync(resolve(dir, "metrics-token"), token(), { mode: 0o600 });
console.log(
  `Credentials generated in ${dir}. Read operators.json locally to sign in; never commit or share it.`,
);
