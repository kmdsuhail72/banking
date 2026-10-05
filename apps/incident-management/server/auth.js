import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { Problem } from "./domain.js";

export const equal = (a, b) =>
  timingSafeEqual(
    createHash("sha256")
      .update(a || "")
      .digest(),
    createHash("sha256")
      .update(b || "")
      .digest(),
  );
export function authentication(config) {
  const sessions = new Map();
  const attempts = new Map();
  function session(req) {
    const id = (req.headers.cookie || "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("incident_session="))
      ?.slice(17);
    const value = sessions.get(id);
    if (!value || value.expires < Date.now()) {
      sessions.delete(id);
      return null;
    }
    return { ...value, id };
  }
  const timer = setInterval(() => {
    for (const [id, s] of sessions)
      if (s.expires < Date.now()) sessions.delete(id);
    for (const [id, s] of attempts)
      if (s.until < Date.now()) attempts.delete(id);
  }, 60000);
  timer.unref();
  function login(req, res) {
    if (req.headers.origin !== config.origin)
      throw new Problem(403, "Invalid origin");
    const ip = req.socket.remoteAddress;
    const now = Date.now();
    const limit = attempts.get(ip) || { count: 0, until: now + 60000 };
    if (limit.until < now) {
      limit.count = 0;
      limit.until = now + 60000;
    }
    if (attempts.size > 10000 || ++limit.count > 10)
      throw new Problem(429, "Try again later");
    attempts.set(ip, limit);
    const user = config.operators.find((u) => u.name === req.body?.name);
    if (
      !user ||
      typeof req.body?.token !== "string" ||
      !equal(req.body.token, user.token)
    )
      throw new Problem(401, "Invalid credentials");
    if (sessions.size >= 10000)
      throw new Problem(503, "Session capacity reached");
    const id = randomBytes(32).toString("hex");
    sessions.set(id, {
      name: user.name,
      role: user.role,
      expires: now + 8 * 60 * 60 * 1000,
    });
    res.setHeader(
      "Set-Cookie",
      `incident_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${config.secure ? "; Secure" : ""}`,
    );
    res.json({ name: user.name, role: user.role });
  }
  function requireUser(req, res, next) {
    const user = session(req);
    if (!user) throw new Problem(401, "Sign in required");
    if (!["GET", "HEAD"].includes(req.method)) {
      if (req.headers.origin !== config.origin)
        throw new Problem(403, "Invalid origin");
      if (
        user.role !== "operator" &&
        !(req.method === "DELETE" && req.originalUrl === "/api/session")
      )
        throw new Problem(403, "Operator role required");
    }
    req.user = user;
    next();
  }
  function logout(req, res) {
    const s = session(req);
    if (s) sessions.delete(s.id);
    res.setHeader(
      "Set-Cookie",
      "incident_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
    );
    res.sendStatus(204);
  }
  return {
    session,
    login,
    requireUser,
    logout,
    close: () => clearInterval(timer),
  };
}
