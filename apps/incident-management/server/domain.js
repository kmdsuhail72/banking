import { createHash, randomUUID } from "node:crypto";

export const states = [
  "OPEN",
  "INVESTIGATING",
  "MITIGATING",
  "RESOLVED",
  "CLOSED",
];
export const severities = ["SEV-1", "SEV-2", "SEV-3", "SEV-4"];
export class Problem extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function text(value, name, max = 2000, required = false) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new Problem(400, `Invalid ${name}`);
  return value.trim();
}
export function choice(value, allowed, name) {
  if (!allowed.includes(value)) throw new Problem(400, `Invalid ${name}`);
  return value;
}
export function event(actor, type, message) {
  return { id: randomUUID(), at: new Date(), actor, type, message };
}
export function dashboard(base, service) {
  const url = new URL("/d/banking-slo", base);
  url.searchParams.set("var-service", service);
  return url.toString();
}
export function manual(body, actor, grafana) {
  const service = text(body.service, "service", 120, true);
  return {
    title: text(body.title, "title", 200, true),
    service,
    severity: choice(body.severity, severities, "severity"),
    status: "OPEN",
    description: text(body.description ?? "", "description"),
    owner: "",
    assignee: "",
    impact: "",
    rootCause: "",
    postmortem: "",
    tasks: [],
    version: 0,
    source: "manual",
    openedAt: new Date(),
    dashboardUrl: dashboard(grafana, service),
    timeline: [event(actor, "CREATED", "Incident opened")],
  };
}
export function update(current, body, actor, operators) {
  if (!Number.isInteger(body.version) || body.version !== current.version)
    throw new Problem(409, "Incident changed. Reload before saving.");
  if (current.status === "CLOSED")
    throw new Problem(409, "Closed incidents are immutable");
  const patch = {};
  for (const field of [
    "title",
    "description",
    "impact",
    "rootCause",
    "postmortem",
  ]) {
    if (body[field] !== undefined)
      patch[field] = text(
        body[field],
        field,
        ["rootCause", "postmortem", "impact"].includes(field) ? 20000 : 2000,
        field === "title",
      );
  }
  if (body.severity !== undefined)
    patch.severity = choice(body.severity, severities, "severity");
  for (const field of ["owner", "assignee"])
    if (body[field] !== undefined) {
      if (body[field] !== "" && !operators.includes(body[field]))
        throw new Problem(400, "Unknown operator");
      patch[field] = body[field];
    }
  if (body.status !== undefined && body.status !== current.status) {
    if (states[states.indexOf(current.status) + 1] !== body.status)
      throw new Problem(409, "Only the next lifecycle state is allowed");
    if (!(patch.owner ?? current.owner))
      throw new Problem(400, "Assign an owner before advancing");
    if (body.status === "RESOLVED") {
      if (!(patch.impact ?? current.impact).trim())
        throw new Problem(400, "Impact assessment required to resolve");
      patch.resolvedAt = new Date();
    }
    if (body.status === "CLOSED") {
      if (
        !(patch.rootCause ?? current.rootCause).trim() ||
        !(patch.postmortem ?? current.postmortem).trim()
      )
        throw new Problem(400, "Root cause and postmortem required to close");
      if (current.tasks.some((t) => t.status !== "DONE"))
        throw new Problem(400, "Complete remediation tasks before closing");
      patch.closedAt = new Date();
    }
    patch.status = body.status;
  }
  if (!Object.keys(patch).length)
    throw new Problem(400, "No supported changes");
  return {
    patch,
    entry: event(
      actor,
      "UPDATED",
      `Changed: ${Object.keys(patch)
        .map((key) =>
          ["owner", "assignee", "status", "severity"].includes(key)
            ? `${key}: ${current[key] || "unassigned"} ? ${patch[key] || "unassigned"}`
            : key,
        )
        .join(", ")}`,
    ),
  };
}
export function alertOccurrence(alert, grafana) {
  if (!alert || !["firing", "resolved"].includes(alert.status))
    throw new Problem(400, "Invalid alert status");
  const labels = alert.labels;
  if (
    !labels ||
    typeof labels !== "object" ||
    Array.isArray(labels) ||
    Object.keys(labels).length > 50
  )
    throw new Problem(400, "Invalid alert labels");
  const entries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
  for (const [key, value] of entries) {
    text(key, "label key", 120, true);
    text(value, "label value", 500);
  }
  const name = text(labels.alertname, "alertname", 200, true);
  const service = text(
    labels.service || labels.job || "unknown",
    "service",
    120,
    true,
  );
  const started = new Date(alert.startsAt);
  if (
    !Number.isFinite(started.getTime()) ||
    started.getTime() > Date.now() + 300000
  )
    throw new Problem(400, "Invalid startsAt");
  const ended = alert.status === "resolved" ? new Date(alert.endsAt) : null;
  if (ended && (!Number.isFinite(ended.getTime()) || ended < started))
    throw new Problem(400, "Invalid endsAt");
  const occurrenceKey = createHash("sha256")
    .update(JSON.stringify(entries) + started.toISOString())
    .digest("hex");
  const doc = manual(
    {
      title: name,
      service,
      severity: "SEV-1",
      description:
        alert.annotations?.description || alert.annotations?.summary || "",
    },
    "alertmanager",
    grafana,
  );
  return {
    ...doc,
    source: "alertmanager",
    occurrenceKey,
    alertName: name,
    openedAt: started,
    alertState: alert.status,
    alertEndedAt: ended,
    timeline: [
      event(
        "alertmanager",
        "ALERT_RECEIVED",
        `${name} ${alert.status}; started ${started.toISOString()}`,
      ),
    ],
  };
}
