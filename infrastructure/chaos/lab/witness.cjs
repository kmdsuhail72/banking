const crypto = require("node:crypto");
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    if (typeof value.toHexString === "function") return value.toHexString();
    if (value instanceof Date) return value.toISOString();
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k])]),
    );
  }
  return value;
}
function assess(users, transactions, collections) {
  const data = canonical({
    users,
    transactions,
    collections: [...collections].sort(),
  });
  const violations =
    Number(users.length !== 1) +
    Number(transactions.length !== 0) +
    Number(users[0]?.balance !== 50000) +
    Number(users[0]?.email !== "synthetic@example.invalid") +
    Number(collections.some((c) => !["users", "transactions"].includes(c)));
  return {
    hash: crypto
      .createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex"),
    violations,
    users: users.length,
    transactions: transactions.length,
    checkedAt: Date.now() / 1000,
    syntheticOnly: true,
  };
}
module.exports = { assess, canonical };
if (require.main === module) {
  const mongoose = require("/app/node_modules/mongoose");
  const http = require("node:http");
  mongoose.set("bufferCommands", false);
  async function snapshot() {
    const db = mongoose.connection.db;
    const auth = await db.command({ connectionStatus: 1 });
    const roles = auth.authInfo.authenticatedUserRoles;
    if (
      roles.length !== 1 ||
      roles[0].role !== "read" ||
      roles[0].db !== "banking_chaos"
    )
      throw Error("Read-only fixture role required");
    const collections = await db
      .listCollections({}, { nameOnly: true })
      .toArray();
    const users = await db
      .collection("users")
      .find({})
      .sort({ _id: 1 })
      .limit(1001)
      .toArray();
    const transactions = await db
      .collection("transactions")
      .find({})
      .sort({ _id: 1 })
      .limit(1001)
      .toArray();
    return {
      ...assess(
        users,
        transactions,
        collections.map((c) => c.name),
      ),
      readOnlyRole: true,
    };
  }
  mongoose
    .connect(process.env.MONGO_URI, {
      autoIndex: false,
      autoCreate: false,
      serverSelectionTimeoutMS: 1500,
    })
    .then(() => {
      http
        .createServer(async (req, res) => {
          if (
            req.method !== "GET" ||
            !["/snapshot", "/metrics"].includes(req.url)
          ) {
            res.writeHead(404);
            res.end();
            return;
          }
          try {
            const result = await snapshot();
            if (req.url === "/metrics") {
              res.setHeader("Content-Type", "text/plain; version=0.0.4");
              res.end(
                `banking_chaos_integrity_violations ${result.violations}\nbanking_chaos_integrity_checked_timestamp_seconds ${result.checkedAt}\n`,
              );
            } else {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
            }
          } catch {
            res.writeHead(503);
            res.end('{"error":"Integrity is unknown"}');
          }
        })
        .listen(8082, "0.0.0.0");
    })
    .catch(() => process.exit(1));
}
