import express from "express";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import { Registry, Gauge, Counter, collectDefaultMetrics } from "prom-client";
import { authentication, equal } from "./auth.js";
import {
  Problem,
  states,
  severities,
  text,
  choice,
  manual,
  update,
  event,
  alertOccurrence,
} from "./domain.js";

export function createApplication(Incident, config) {
  const app = express();
  const server = createServer(app);
  const auth = authentication(config);
  const operators = config.operators
    .filter((u) => u.role === "operator")
    .map((u) => u.name);
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  const registry = new Registry();
  collectDefaultMetrics({ register: registry, prefix: "banking_incident_" });
  const webhooks = new Counter({
    name: "banking_incident_webhook_total",
    help: "Processed alert webhook batches",
    labelNames: ["result"],
    registers: [registry],
  });
  new Gauge({
    name: "banking_incidents",
    help: "Persisted incidents by status and severity",
    labelNames: ["status", "severity"],
    registers: [registry],
    async collect() {
      const rows = await Incident.aggregate([
        {
          $group: {
            _id: { status: "$status", severity: "$severity" },
            count: { $sum: 1 },
          },
        },
      ]);
      this.reset();
      for (const status of states)
        for (const severity of severities) this.set({ status, severity }, 0);
      for (const row of rows) this.set(row._id, row.count);
    },
  });
  const broadcast = (doc) => {
    const payload = JSON.stringify({
      type: "incident.changed",
      id: String(doc._id),
      version: doc.version,
    });
    for (const ws of wss.clients)
      if (ws.readyState === WebSocket.OPEN) {
        if (ws.bufferedAmount > 65536) ws.terminate();
        else ws.send(payload);
      }
  };
  server.on("upgrade", (req, socket, head) => {
    const user = auth.session(req);
    if (req.url !== "/ws" || req.headers.origin !== config.origin || !user) {
      socket.end("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.request = req;
      ws.alive = true;
      ws.on("pong", () => (ws.alive = true));
      ws.on("error", () => {});
      ws.send(JSON.stringify({ type: "connected" }));
    });
  });
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.alive || !auth.session(ws.request)) {
        ws.terminate();
        continue;
      }
      ws.alive = false;
      ws.ping();
    }
  }, 30000);
  heartbeat.unref();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
    if (req.path.startsWith("/api")) res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.get("/health/live", (_req, res) => res.json({ status: "ok" }));
  app.get("/health/ready", (_req, res) =>
    res
      .status(Incident.db.readyState === 1 ? 200 : 503)
      .json({ ready: Incident.db.readyState === 1 }),
  );
  app.get("/metrics", async (req, res) => {
    if (!equal(req.headers.authorization, `Bearer ${config.metricsToken}`))
      throw new Problem(401, "Unauthorized");
    res.type(registry.contentType).send(await registry.metrics());
  });
  app.use(express.json({ limit: "256kb", strict: true }));
  app.post("/api/session", auth.login);
  app.post("/api/alertmanager", async (req, res) => {
    if (!equal(req.headers.authorization, `Bearer ${config.webhookToken}`))
      throw new Problem(401, "Unauthorized");
    if (!Array.isArray(req.body.alerts) || req.body.alerts.length > 100)
      throw new Problem(400, "Expected at most 100 alerts");
    // Validate the entire batch first. Occurrence key includes all labels and startsAt.
    const alerts = req.body.alerts
      .filter((a) => a?.labels?.severity === "critical")
      .map((a) => alertOccurrence(a, config.grafanaUrl));
    const ids = [];
    for (const candidate of alerts) {
      let doc;
      try {
        doc = await Incident.findOneAndUpdate(
          { occurrenceKey: candidate.occurrenceKey },
          { $setOnInsert: candidate },
          { upsert: true, new: true, runValidators: true },
        );
      } catch (error) {
        if (error.code !== 11000) throw error;
        doc = await Incident.findOne({
          occurrenceKey: candidate.occurrenceKey,
        });
      }
      if (candidate.alertState === "resolved") {
        const changed = await Incident.findOneAndUpdate(
          { _id: doc._id, alertState: { $ne: "resolved" } },
          {
            $set: {
              alertState: "resolved",
              alertEndedAt: candidate.alertEndedAt,
            },
            $inc: { version: 1 },
            $push: {
              timeline: event(
                "alertmanager",
                "ALERT_RESOLVED",
                "Alert recovered; operator confirmation is required",
              ),
            },
          },
          { new: true },
        );
        if (changed) doc = changed;
      }
      // A late firing retry must never undo the resolved signal or reopen the lifecycle.
      broadcast(doc);
      ids.push(String(doc._id));
    }
    webhooks.inc({ result: "accepted" });
    res.json({
      incidentIds: ids,
      ignored: req.body.alerts.length - alerts.length,
    });
  });
  app.use("/api", auth.requireUser);
  app.get("/api/session", (req, res) =>
    res.json({ name: req.user.name, role: req.user.role }),
  );
  app.delete("/api/session", auth.logout);
  app.get("/api/operators", (_req, res) => res.json(operators));
  app.get("/api/analytics", async (req, res) => {
    const days = Number(req.query.days || 30);
    if (!Number.isInteger(days) || days < 1 || days > 366)
      throw new Problem(400, "days must be 1..366");
    const rows = await Incident.aggregate([
      {
        $match: { openedAt: { $gte: new Date(Date.now() - days * 86400000) } },
      },
      {
        $facet: {
          bySeverity: [{ $group: { _id: "$severity", count: { $sum: 1 } } }],
          byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          byService: [
            { $group: { _id: "$service", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
          ],
          daily: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$openedAt",
                    timezone: "UTC",
                  },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          recovery: [
            { $match: { resolvedAt: { $type: "date" } } },
            {
              $group: {
                _id: null,
                meanSeconds: {
                  $avg: {
                    $divide: [
                      { $subtract: ["$resolvedAt", "$openedAt"] },
                      1000,
                    ],
                  },
                },
                resolvedCount: { $sum: 1 },
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      },
    ]);
    res.json({ days, ...rows[0] });
  });
  app.get("/api/incidents", async (req, res) => {
    const filter = {};
    if (req.query.status)
      filter.status = choice(req.query.status, states, "status");
    if (req.query.severity)
      filter.severity = choice(req.query.severity, severities, "severity");
    if (req.query.service)
      filter.service = text(req.query.service, "service", 120);
    if (req.query.search) {
      const search = text(req.query.search, "search", 100);
      filter.title = {
        $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }
    const page = Number(req.query.page || 1);
    if (!Number.isInteger(page) || page < 1 || page > 1000)
      throw new Problem(400, "Invalid page");
    const [items, total] = await Promise.all([
      Incident.find(filter)
        .select("-timeline -postmortem -rootCause -tasks")
        .sort({ openedAt: -1, _id: -1 })
        .skip((page - 1) * 25)
        .limit(25)
        .lean(),
      Incident.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / 25) });
  });
  app.post("/api/incidents", async (req, res) => {
    const doc = await Incident.create(
      manual(req.body, req.user.name, config.grafanaUrl),
    );
    broadcast(doc);
    res.status(201).json(doc);
  });
  app.param("id", (req, _res, next, id) => {
    if (!/^[a-f\d]{24}$/i.test(id))
      throw new Problem(400, "Invalid incident id");
    next();
  });
  async function get(id) {
    const doc = await Incident.findById(id).lean();
    if (!doc) throw new Problem(404, "Incident not found");
    return doc;
  }
  async function save(current, patch, entry) {
    if (current.timeline.length >= 5000)
      throw new Problem(
        409,
        "Timeline limit reached; archive incident before further updates",
      );
    const doc = await Incident.findOneAndUpdate(
      { _id: current._id, version: current.version },
      { $set: patch, $inc: { version: 1 }, $push: { timeline: entry } },
      { new: true, runValidators: true },
    );
    if (!doc) throw new Problem(409, "Incident changed. Reload before saving.");
    broadcast(doc);
    return doc;
  }
  function writable(current, version) {
    if (current.status === "CLOSED")
      throw new Problem(409, "Closed incidents are immutable");
    if (!Number.isInteger(version) || version !== current.version)
      throw new Problem(409, "Incident changed. Reload before saving.");
  }
  app.get("/api/incidents/:id", async (req, res) =>
    res.json(await get(req.params.id)),
  );
  app.patch("/api/incidents/:id", async (req, res) => {
    const current = await get(req.params.id);
    const { patch, entry } = update(
      current,
      req.body,
      req.user.name,
      operators,
    );
    res.json(await save(current, patch, entry));
  });
  app.post("/api/incidents/:id/events", async (req, res) => {
    const current = await get(req.params.id);
    writable(current, req.body.version);
    res.json(
      await save(
        current,
        {},
        event(
          req.user.name,
          "NOTE",
          text(req.body.message, "message", 2000, true),
        ),
      ),
    );
  });
  app.post("/api/incidents/:id/tasks", async (req, res) => {
    const current = await get(req.params.id);
    writable(current, req.body.version);
    if (current.tasks.length >= 100)
      throw new Problem(400, "Task limit reached");
    const dueAt = new Date(req.body.dueAt);
    if (!Number.isFinite(dueAt.getTime()))
      throw new Problem(400, "Valid due date required");
    const task = {
      id: randomUUID(),
      title: text(req.body.title, "task title", 500, true),
      assignee: choice(req.body.assignee, operators, "assignee"),
      dueAt,
      status: "TODO",
    };
    res
      .status(201)
      .json(
        await save(
          current,
          { tasks: [...current.tasks, task] },
          event(req.user.name, "TASK_CREATED", task.title),
        ),
      );
  });
  app.patch("/api/incidents/:id/tasks/:taskId", async (req, res) => {
    const current = await get(req.params.id);
    writable(current, req.body.version);
    const task = current.tasks.find((t) => t.id === req.params.taskId);
    if (!task) throw new Problem(404, "Task not found");
    if (req.body.status !== undefined)
      task.status = choice(
        req.body.status,
        ["TODO", "IN_PROGRESS", "DONE"],
        "task status",
      );
    if (req.body.assignee !== undefined)
      task.assignee = choice(req.body.assignee, operators, "assignee");
    res.json(
      await save(
        current,
        { tasks: current.tasks },
        event(
          req.user.name,
          "TASK_UPDATED",
          `${task.title}: ${task.status}, assigned ${task.assignee}`,
        ),
      ),
    );
  });
  app.use("/api", (_req, _res, next) =>
    next(new Problem(404, "Endpoint not found")),
  );
  const dist = fileURLToPath(new URL("../dist/", import.meta.url));
  app.use(express.static(dist));
  app.get("/{*path}", (_req, res) => res.sendFile(dist + "index.html"));
  app.use((error, _req, res, _next) => {
    const status =
      error.status || (error.name === "ValidationError" ? 400 : 503);
    if (status >= 500) console.error("Incident request failed:", error.name);
    res
      .status(status)
      .json({
        error:
          status >= 500 ? "Service temporarily unavailable" : error.message,
      });
  });
  return {
    app,
    server,
    wss,
    async close() {
      clearInterval(heartbeat);
      auth.close();
      for (const ws of wss.clients) ws.terminate();
      await new Promise((r) => wss.close(r));
      await new Promise((r) => server.close(r));
    },
  };
}
