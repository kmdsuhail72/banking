import { readFileSync } from "node:fs";
import mongoose from "mongoose";
import { createApplication } from "./app.js";
import { incidentModel } from "./model.js";

const operators = JSON.parse(
  readFileSync(
    process.env.OPERATORS_FILE || "/run/secrets/operators.json",
    "utf8",
  ),
);
if (
  !Array.isArray(operators) ||
  !operators.length ||
  operators.some(
    (u) =>
      !/^[a-zA-Z0-9._-]{1,80}$/.test(u.name) ||
      !["operator", "viewer"].includes(u.role) ||
      typeof u.token !== "string" ||
      u.token.length < 32,
  ) ||
  new Set(operators.map((u) => u.name)).size !== operators.length
)
  throw Error("Configure unique operators with strong access tokens");
const webhookToken = readFileSync(
  process.env.WEBHOOK_TOKEN_FILE || "/run/secrets/webhook-token",
  "utf8",
).trim();
const metricsToken = readFileSync(
  process.env.METRICS_TOKEN_FILE || "/run/secrets/metrics-token",
  "utf8",
).trim();
if (webhookToken.length < 32 || metricsToken.length < 32)
  throw Error("Configure strong webhook and metrics tokens");
const origin = new URL(process.env.PUBLIC_ORIGIN || "http://localhost:4020")
  .origin;
const grafanaUrl = new URL(
  process.env.GRAFANA_PUBLIC_URL || "http://localhost:3001",
);
if (!["http:", "https:"].includes(grafanaUrl.protocol))
  throw Error("Invalid Grafana URL");
mongoose.set("bufferCommands", false);
await mongoose.connect(
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/banking_incidents",
  { serverSelectionTimeoutMS: 5000 },
);
const Incident = incidentModel(mongoose.connection);
await Incident.init();
const application = createApplication(Incident, {
  operators,
  webhookToken,
  metricsToken,
  origin,
  grafanaUrl: grafanaUrl.toString(),
  secure: origin.startsWith("https:"),
});
application.server.listen(Number(process.env.PORT || 4020), "0.0.0.0", () =>
  console.log("Incident management listening"),
);
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    if (stopping) return;
    stopping = true;
    const timer = setTimeout(() => process.exit(1), 10000);
    timer.unref();
    await application.close();
    await mongoose.disconnect();
    clearTimeout(timer);
  });
