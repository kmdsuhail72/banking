import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { WebSocket } from "ws";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApplication } from "../server/app.js";
import { incidentModel } from "../server/model.js";

test(
  "MongoDB + HTTP + WebSocket incident workflow and alert retry integration",
  { timeout: 180000 },
  async (t) => {
    const mongo = await MongoMemoryServer.create({
      binary: {
        version: "8.0.17",
        downloadDir: "../../.local/mongodb-binaries",
      },
    });
    const connection = await mongoose
      .createConnection(mongo.getUri(), { dbName: "incident_integration" })
      .asPromise();
    const Incident = incidentModel(connection);
    await Incident.init();
    const config = {
      origin: "http://localhost:4020",
      grafanaUrl: "http://localhost:3001",
      secure: false,
      webhookToken: "w".repeat(40),
      metricsToken: "m".repeat(40),
      operators: [
        { name: "alice", role: "operator", token: "a".repeat(40) },
        { name: "bob", role: "viewer", token: "b".repeat(40) },
      ],
    };
    const app = createApplication(Incident, config);
    await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
    t.after(async () => {
      await app.close();
      await connection.close();
      await mongo.stop();
    });
    const base = `http://127.0.0.1:${app.server.address().port}`;
    async function request(path, method = "GET", body, cookie, extra = {}) {
      const response = await fetch(base + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Origin: config.origin,
          ...(cookie ? { Cookie: cookie } : {}),
          ...extra,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const data = response.status === 204 ? null : await response.json();
      return { response, data };
    }
    assert.equal((await request("/api/incidents")).response.status, 401);
    assert.equal(
      (await request("/api/session", "POST", { name: "alice", token: "bad" }))
        .response.status,
      401,
    );
    const login = await request("/api/session", "POST", {
      name: "alice",
      token: "a".repeat(40),
    });
    assert.equal(login.response.status, 200);
    const cookie = login.response.headers.get("set-cookie").split(";")[0];
    const viewer = await request("/api/session", "POST", {
      name: "bob",
      token: "b".repeat(40),
    });
    const viewerCookie = viewer.response.headers
      .get("set-cookie")
      .split(";")[0];
    assert.equal(
      (
        await request(
          "/api/incidents",
          "POST",
          { title: "No", service: "ledger", severity: "SEV-1" },
          viewerCookie,
        )
      ).response.status,
      403,
    );
    assert.equal(
      (
        await request("/api/incidents", "POST", {}, cookie, {
          Origin: "http://evil.example",
        })
      ).response.status,
      403,
    );
    const ws = new WebSocket(base.replace("http:", "ws:") + "/ws", {
      headers: { Cookie: cookie, Origin: config.origin },
    });
    await once(ws, "open");
    const notification = new Promise((resolve) =>
      ws.on("message", (raw) => {
        const data = JSON.parse(raw);
        if (data.type === "incident.changed") resolve(data);
      }),
    );
    const created = await request(
      "/api/incidents",
      "POST",
      { title: "Ledger timeout", service: "ledger", severity: "SEV-1" },
      cookie,
    );
    assert.equal(created.response.status, 201, JSON.stringify(created.data));
    let doc = created.data;
    assert.equal((await notification).id, doc._id);
    async function patch(body) {
      const result = await request(
        "/api/incidents/" + doc._id,
        "PATCH",
        { version: doc.version, ...body },
        cookie,
      );
      if (result.response.ok) doc = result.data;
      return result;
    }
    assert.equal((await patch({ status: "RESOLVED" })).response.status, 409);
    assert.equal(
      (
        await patch({
          owner: "alice",
          assignee: "alice",
          status: "INVESTIGATING",
        })
      ).response.status,
      200,
    );
    const stale = doc.version - 1;
    assert.equal(
      (
        await request(
          "/api/incidents/" + doc._id,
          "PATCH",
          { version: stale, title: "Stale" },
          cookie,
        )
      ).response.status,
      409,
    );
    await patch({ status: "MITIGATING" });
    assert.equal((await patch({ status: "RESOLVED" })).response.status, 400);
    await patch({ impact: "10 customers affected", status: "RESOLVED" });
    const task = await request(
      `/api/incidents/${doc._id}/tasks`,
      "POST",
      {
        version: doc.version,
        title: "Add retry bound",
        assignee: "alice",
        dueAt: "2027-01-01",
      },
      cookie,
    );
    assert.equal(task.response.status, 201);
    doc = task.data;
    assert.equal(
      (
        await patch({
          status: "CLOSED",
          rootCause: "Dependency overloaded",
          postmortem: "Capacity test and retry limits",
        })
      ).response.status,
      400,
    );
    const done = await request(
      `/api/incidents/${doc._id}/tasks/${doc.tasks[0].id}`,
      "PATCH",
      { version: doc.version, status: "DONE" },
      cookie,
    );
    doc = done.data;
    assert.equal(
      (
        await patch({
          status: "CLOSED",
          rootCause: "Dependency overloaded",
          postmortem: "Capacity test and retry limits",
        })
      ).response.status,
      200,
    );
    assert.equal((await patch({ impact: "rewrite" })).response.status, 409);
    const alert = {
      status: "firing",
      startsAt: new Date(Date.now() - 60000).toISOString(),
      labels: {
        alertname: "BankingSloBudgetExhausted",
        service: "ledger",
        severity: "critical",
      },
      annotations: { summary: "Budget exhausted" },
    };
    const webhook = (body) =>
      request("/api/alertmanager", "POST", body, undefined, {
        Authorization: "Bearer " + config.webhookToken,
      });
    assert.equal(
      (await request("/api/alertmanager", "POST", { alerts: [alert] })).response
        .status,
      401,
    );
    const batches = await Promise.all(
      Array.from({ length: 8 }, () => webhook({ alerts: [alert] })),
    );
    for (const result of batches) assert.equal(result.response.status, 200);
    const id = batches[0].data.incidentIds[0];
    assert.ok(batches.every((r) => r.data.incidentIds[0] === id));
    assert.equal(await Incident.countDocuments({ source: "alertmanager" }), 1);
    await webhook({
      alerts: [
        { ...alert, status: "resolved", endsAt: new Date().toISOString() },
      ],
    });
    await webhook({ alerts: [alert] });
    const resolved = await Incident.findById(id);
    assert.equal(resolved.status, "OPEN");
    assert.equal(resolved.alertState, "resolved");
    assert.equal(
      resolved.timeline.filter((e) => e.type === "ALERT_RESOLVED").length,
      1,
    );
    await webhook({
      alerts: [{ ...alert, startsAt: new Date().toISOString() }],
    });
    assert.equal(await Incident.countDocuments({ source: "alertmanager" }), 2);
    const analytics = await request("/api/analytics", "GET", undefined, cookie);
    assert.equal(analytics.data.total[0].count, 3);
    assert.equal(analytics.data.recovery[0].resolvedCount, 1);
    const metrics = await fetch(base + "/metrics", {
      headers: { Authorization: "Bearer " + config.metricsToken },
    });
    assert.equal(metrics.status, 200);
    assert.match(await metrics.text(), /banking_incidents/);
    assert.equal(
      (await request("/api/session", "DELETE", undefined, viewerCookie))
        .response.status,
      204,
    );
    ws.close();
    await once(ws, "close");
  },
);
