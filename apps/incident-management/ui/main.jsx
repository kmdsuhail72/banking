import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
const STATES = ["OPEN", "INVESTIGATING", "MITIGATING", "RESOLVED", "CLOSED"];
const SEVERITIES = ["SEV-1", "SEV-2", "SEV-3", "SEV-4"];
const date = (v) => (v ? new Date(v).toLocaleString() : "�");
async function api(path, options = {}) {
  const response = await fetch("/api" + path, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw Error(data.error || "Request failed");
  return data;
}
const send = (path, method, body) =>
  api(path, { method, body: JSON.stringify(body) });
function App() {
  const [user, setUser] = useState(null),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState("");
  const [items, setItems] = useState([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    [severity, setSeverity] = useState(""),
    [search, setSearch] = useState("");
  const [operators, setOperators] = useState([]),
    [analytics, setAnalytics] = useState(null),
    [selected, setSelected] = useState(null),
    [draft, setDraft] = useState(null),
    [dirty, setDirty] = useState(false),
    [changed, setChanged] = useState(false),
    [live, setLive] = useState(false),
    [busy, setBusy] = useState(false),
    [creating, setCreating] = useState(false);
  const state = useRef({});
  state.current = { selected, dirty, page, status, severity, search };
  const editor = user?.role === "operator";
  async function run(work) {
    setError("");
    setBusy(true);
    try {
      await work();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    const s = state.current;
    const q = new URLSearchParams({
      page: String(s.page),
      ...(s.status ? { status: s.status } : {}),
      ...(s.severity ? { severity: s.severity } : {}),
      ...(s.search ? { search: s.search } : {}),
    });
    const [list, stats] = await Promise.all([
      api("/incidents?" + q),
      api("/analytics"),
    ]);
    setItems(list.items);
    setTotal(list.total);
    setAnalytics(stats);
  }
  async function select(id) {
    const doc = await api("/incidents/" + id);
    setSelected(doc);
    setDraft(doc);
    setDirty(false);
    setChanged(false);
  }
  function edit(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  }
  useEffect(() => {
    api("/session")
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (user)
      run(async () => {
        await refresh();
        setOperators(await api("/operators"));
      });
  }, [user, page, status, severity, search]);
  useEffect(() => {
    if (!user) return;
    let stopped = false,
      socket,
      timer,
      delay = 1000;
    async function sync() {
      try {
        await refresh();
        const s = state.current;
        if (s.selected) {
          if (s.dirty) setChanged(true);
          else await select(s.selected._id);
        }
      } catch (e) {
        if (!stopped) setError(e.message);
      }
    }
    function connect() {
      if (stopped) return;
      socket = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`,
      );
      socket.onopen = () => {
        setLive(true);
        delay = 1000;
        sync();
      };
      socket.onmessage = () => sync();
      socket.onerror = () => socket.close();
      socket.onclose = () => {
        setLive(false);
        if (!stopped) {
          timer = setTimeout(connect, delay);
          delay = Math.min(delay * 2, 30000);
        }
      };
    }
    connect();
    const poll = setInterval(sync, 30000);
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearInterval(poll);
      socket?.close();
    };
  }, [user]);
  async function mutate(path, method, body) {
    const doc = await send(path, method, body);
    setSelected(doc);
    setDraft(doc);
    setDirty(false);
    setChanged(false);
    await refresh();
  }
  if (!loaded)
    return (
      <main className="login">
        <p>Loading incident command�</p>
      </main>
    );
  if (!user)
    return (
      <main className="login">
        <div className="login-card">
          <p className="eyebrow">BANKING / SITE RELIABILITY</p>
          <h1>
            Incident
            <br />
            Command
          </h1>
          <p className="muted">
            Coordinate response. Restore service. Learn from every incident.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              run(async () =>
                setUser(
                  await send("/session", "POST", Object.fromEntries(data)),
                ),
              );
            }}
          >
            <label>
              Operator
              <input name="name" autoComplete="username" required />
            </label>
            <label>
              Access token
              <input
                name="token"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <button disabled={busy}>Sign in</button>
          </form>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <small>Authorized banking operations personnel only.</small>
        </div>
      </main>
    );
  return (
    <div className="shell">
      <header>
        <div>
          <p className="eyebrow">BANKING / SITE RELIABILITY</p>
          <h1>Incident Command</h1>
        </div>
        <div className="header-actions">
          <span className={"connection " + (live ? "online" : "")}>
            {live ? "? Live updates" : "? Reconnecting � polling active"}
          </span>
          <span>
            {user.name} � {user.role}
          </span>
          <button
            className="secondary"
            onClick={() =>
              run(async () => {
                await api("/session", { method: "DELETE" });
                setUser(null);
                setSelected(null);
              })
            }
          >
            Sign out
          </button>
        </div>
      </header>
      {error && (
        <div role="alert" className="error banner">
          {error}
          <button className="secondary" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}
      <section className="stats">
        <article>
          <span>INCIDENTS � 30 DAYS</span>
          <strong>{analytics?.total?.[0]?.count ?? 0}</strong>
        </article>
        <article>
          <span>ACTIVE � 30-DAY COHORT</span>
          <strong>
            {analytics?.byStatus
              ?.filter((s) => !["RESOLVED", "CLOSED"].includes(s._id))
              .reduce((n, s) => n + s.count, 0) ?? 0}
          </strong>
        </article>
        <article>
          <span>SEV-1 � 30 DAYS</span>
          <strong>
            {analytics?.bySeverity?.find((s) => s._id === "SEV-1")?.count ?? 0}
          </strong>
        </article>
        <article>
          <span>MEAN TIME TO RESOLVE</span>
          <strong>
            {analytics?.recovery?.[0]
              ? Math.round(analytics.recovery[0].meanSeconds / 60) + " min"
              : "�"}
          </strong>
          <small>
            {analytics?.recovery?.[0]?.resolvedCount ?? 0} resolved incidents
          </small>
        </article>
      </section>
      <div className="workspace">
        <section className="queue">
          <div className="section-title">
            <h2>
              Incident history <small>{total}</small>
            </h2>
            {editor && (
              <button onClick={() => setCreating(!creating)}>
                + Create incident
              </button>
            )}
          </div>
          {creating && (
            <form
              className="create-form"
              onSubmit={(e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.currentTarget));
                run(async () => {
                  const doc = await send("/incidents", "POST", data);
                  setCreating(false);
                  await refresh();
                  await select(doc._id);
                });
              }}
            >
              <label>
                Title
                <input name="title" required maxLength={200} />
              </label>
              <label>
                Affected service
                <input
                  name="service"
                  required
                  maxLength={120}
                  placeholder="transaction-service"
                />
              </label>
              <label>
                Severity
                <select name="severity">
                  {SEVERITIES.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Description
                <textarea name="description" maxLength={2000} />
              </label>
              <button disabled={busy}>Open incident</button>
            </form>
          )}
          <div className="filters">
            <input
              aria-label="Search incident titles"
              placeholder="Search incidents�"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <select
              aria-label="Filter status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All states</option>
              {STATES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <select
              aria-label="Filter severity"
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All severities</option>
              {SEVERITIES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="incident-list">
            {items.map((item) => (
              <button
                key={item._id}
                className={
                  "incident-row " +
                  (selected?._id === item._id ? "selected" : "")
                }
                onClick={() => {
                  if (!dirty || confirm("Discard unsaved edits?"))
                    run(() => select(item._id));
                }}
              >
                <span className={"badge " + item.severity}>
                  {item.severity}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>
                    {item.service} � {item.status}
                  </p>
                  <small>
                    {date(item.openedAt)} � {item.owner || "Unassigned"}
                  </small>
                </div>
                <span>?</span>
              </button>
            ))}
            {!items.length && (
              <p className="empty">No incidents match these filters.</p>
            )}
          </div>
          <div className="pagination">
            <button
              className="secondary"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} / {Math.max(1, Math.ceil(total / 25))}
            </span>
            <button
              className="secondary"
              disabled={page * 25 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
          <details className="analytics">
            <summary>30-day analytics by service and day</summary>
            <h3>Affected services</h3>
            {analytics?.byService?.map((s) => (
              <p key={s._id}>
                {s._id}
                <b>{s.count}</b>
              </p>
            ))}
            <h3>Daily incident count (UTC)</h3>
            {analytics?.daily?.map((s) => (
              <p key={s._id}>
                {s._id}
                <b>{s.count}</b>
              </p>
            ))}
          </details>
        </section>
        <section className="detail">
          {!selected ? (
            <div className="empty">
              <h2>Ready to respond</h2>
              <p>
                Select an incident to assign ownership, assess impact, and
                coordinate recovery.
              </p>
            </div>
          ) : (
            <>
              <div className="section-title">
                <div>
                  <span className={"badge " + selected.severity}>
                    {selected.severity}
                  </span>
                  <h2>{selected.title}</h2>
                  <p className="muted">
                    {selected.service} � {selected.source}{" "}
                    {selected.alertState && `� alert ${selected.alertState}`}
                  </p>
                </div>
                <a
                  href={selected.dashboardUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Grafana ?
                </a>
              </div>
              <div className="lifecycle">
                {STATES.map((s, i) => (
                  <span
                    key={s}
                    className={
                      i <= STATES.indexOf(selected.status) ? "reached" : ""
                    }
                  >
                    {s}
                  </span>
                ))}
              </div>
              <p className="muted">
                Opened {date(selected.openedAt)} � Resolved{" "}
                {date(selected.resolvedAt)}
              </p>
              {changed && (
                <p className="notice">
                  Updates are available. Your draft is preserved.{" "}
                  <button
                    className="secondary"
                    onClick={() => run(() => select(selected._id))}
                  >
                    Reload and discard draft
                  </button>
                </p>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(() =>
                    mutate("/incidents/" + selected._id, "PATCH", {
                      version: draft.version,
                      ...Object.fromEntries(
                        [
                          "title",
                          "description",
                          "owner",
                          "assignee",
                          "severity",
                          "impact",
                          "rootCause",
                          "postmortem",
                        ].map((k) => [k, draft[k] || ""]),
                      ),
                    }),
                  );
                }}
              >
                <fieldset
                  disabled={!editor || selected.status === "CLOSED" || busy}
                >
                  <div className="form-grid">
                    <label>
                      Incident owner
                      <select
                        value={draft.owner || ""}
                        onChange={(e) => edit("owner", e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {operators.map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Assigned responder
                      <select
                        value={draft.assignee || ""}
                        onChange={(e) => edit("assignee", e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {operators.map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Severity
                      <select
                        value={draft.severity}
                        onChange={(e) => edit("severity", e.target.value)}
                      >
                        {SEVERITIES.map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Title
                      <input
                        value={draft.title}
                        onChange={(e) => edit("title", e.target.value)}
                        maxLength={200}
                      />
                    </label>
                  </div>
                  {[
                    ["description", "Situation"],
                    ["impact", "Impact assessment"],
                    ["rootCause", "Root cause analysis"],
                    ["postmortem", "Postmortem document"],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <textarea
                        value={draft[key] || ""}
                        rows={key === "postmortem" ? 6 : 3}
                        maxLength={key === "description" ? 2000 : 20000}
                        placeholder={
                          key === "postmortem"
                            ? "Summary � Detection � What went well � What failed � Lessons � Follow-up actions"
                            : ""
                        }
                        onChange={(e) => edit(key, e.target.value)}
                      />
                    </label>
                  ))}
                  <div className="actions">
                    <button disabled={!dirty}>Save documentation</button>
                    {selected.status !== "CLOSED" && (
                      <button
                        type="button"
                        className="secondary"
                        disabled={dirty}
                        onClick={() =>
                          run(() =>
                            mutate("/incidents/" + selected._id, "PATCH", {
                              version: selected.version,
                              status:
                                STATES[STATES.indexOf(selected.status) + 1],
                            }),
                          )
                        }
                      >
                        Move to {STATES[STATES.indexOf(selected.status) + 1]}
                      </button>
                    )}
                  </div>
                </fieldset>
              </form>
              <h3>Remediation tasks</h3>
              {selected.tasks.map((t) => (
                <div className="task" key={t.id}>
                  <div>
                    <strong>{t.title}</strong>
                    <p>
                      {t.assignee} � due {date(t.dueAt)}
                    </p>
                  </div>
                  <select
                    aria-label={"Status for " + t.title}
                    disabled={
                      !editor || dirty || busy || selected.status === "CLOSED"
                    }
                    value={t.status}
                    onChange={(e) =>
                      run(() =>
                        mutate(
                          `/incidents/${selected._id}/tasks/${t.id}`,
                          "PATCH",
                          { version: selected.version, status: e.target.value },
                        ),
                      )
                    }
                  >
                    {["TODO", "IN_PROGRESS", "DONE"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </div>
              ))}
              {editor && selected.status !== "CLOSED" && (
                <form
                  className="task-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const body = Object.fromEntries(new FormData(form));
                    run(async () => {
                      await mutate(`/incidents/${selected._id}/tasks`, "POST", {
                        ...body,
                        version: selected.version,
                      });
                      form.reset();
                    });
                  }}
                >
                  <label>
                    New task
                    <input name="title" required maxLength={500} />
                  </label>
                  <div className="form-grid">
                    <label>
                      Assignee
                      <select name="assignee" required>
                        <option value="">Select responder</option>
                        {operators.map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Due date
                      <input name="dueAt" type="date" required />
                    </label>
                  </div>
                  <button className="secondary" disabled={busy || dirty}>
                    Add task
                  </button>
                </form>
              )}
              <h3>Event timeline</h3>
              {editor && selected.status !== "CLOSED" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const message = new FormData(form).get("message");
                    run(async () => {
                      await mutate(
                        `/incidents/${selected._id}/events`,
                        "POST",
                        { version: selected.version, message },
                      );
                      form.reset();
                    });
                  }}
                >
                  <label>
                    Response update
                    <textarea name="message" required maxLength={2000} />
                  </label>
                  <button className="secondary" disabled={busy || dirty}>
                    Add timeline event
                  </button>
                </form>
              )}
              <ol className="timeline">
                {[...selected.timeline].reverse().map((t) => (
                  <li key={t.id}>
                    <small>
                      {date(t.at)} � {t.actor} � {t.type}
                    </small>
                    <p>{t.message}</p>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </div>
      <footer>
        Banking reliability operations � All changes are recorded in the
        incident timeline
      </footer>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
