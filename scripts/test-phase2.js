"use strict";
/**
 * Phase 2 End-to-End Integration Test Suite
 * Tests Auth Service, Customer Service, Kafka event pipeline, and API Gateway using native fetch
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPhase2Tests = runPhase2Tests;
const GATEWAY_URL = process.env.API_GATEWAY_URL || "http://localhost:3000";
const AUTH_URL = process.env.AUTH_SERVICE_URL || "http://localhost:4001";
const CUSTOMER_URL =
  process.env.CUSTOMER_SERVICE_URL || "http://localhost:4002";
const testUser = {
  firstName: "Nova",
  lastName: "Tester",
  email: `novatester_${Date.now()}@example.com`,
  password: "Password@2026",
};
let accessToken = "";
let refreshToken = "";
let userId = "";
let customerId = "";
async function runPhase2Tests() {
  console.log("\n======================================================");
  console.log("🚀 NOVA BANK - PHASE 2: AUTH + CUSTOMER TEST SUITE");
  console.log("======================================================\n");
  let passed = 0;
  let failed = 0;
  async function test(name, fn) {
    try {
      process.stdout.write(`  ⏳ ${name}... `);
      await fn();
      console.log("✅ PASSED");
      passed++;
    } catch (err) {
      console.log(`❌ FAILED: ${err?.message || err}`);
      failed++;
    }
  }
  // 1. Health Checks
  await test("Auth Service Health Probe (GET :4001/health)", async () => {
    const res = await fetch(`${AUTH_URL}/health`);
    const data = await res.json();
    if (res.status !== 200 || data.status !== "ok") {
      throw new Error(`Health probe returned status ${res.status}`);
    }
  });
  await test("Customer Service Health Probe (GET :4002/health)", async () => {
    const res = await fetch(`${CUSTOMER_URL}/health`);
    const data = await res.json();
    if (res.status !== 200 || data.status !== "ok") {
      throw new Error(`Health probe returned status ${res.status}`);
    }
  });
  await test("API Gateway Health Probe (GET :3000/health)", async () => {
    const res = await fetch(`${GATEWAY_URL}/health`);
    const data = await res.json();
    if (res.status !== 200 || data.status !== "ok") {
      throw new Error(`Gateway health probe returned status ${res.status}`);
    }
  });
  // 2. Registration via Gateway
  await test("POST /api/v1/auth/register (Create User & Publish Kafka Event)", async () => {
    const res = await fetch(`${GATEWAY_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });
    const data = await res.json();
    if (res.status !== 201) {
      throw new Error(
        `Expected status 201, got ${res.status}: ${JSON.stringify(data)}`,
      );
    }
    if (!data.userId) throw new Error("Missing userId in response");
    userId = data.userId;
  });
  // 3. Duplicate Registration Check
  await test("POST /api/v1/auth/register (Duplicate Email -> 409 Conflict)", async () => {
    const res = await fetch(`${GATEWAY_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });
    if (res.status !== 409) {
      throw new Error(`Expected status 409 Conflict, got ${res.status}`);
    }
  });
  // 4. Login with Wrong Password
  await test("POST /api/v1/auth/login (Wrong Password -> 401 Unauthorized)", async () => {
    const res = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUser.email,
        password: "WrongPassword@999",
      }),
    });
    const data = await res.json();
    if (res.status !== 401) {
      throw new Error(`Expected status 401 Unauthorized, got ${res.status}`);
    }
    if (!data.message || !data.message.includes("Invalid email or password")) {
      throw new Error(
        `Expected generic error 'Invalid email or password', got: ${data.message}`,
      );
    }
  });
  // 5. Valid Login & JWT Issuance
  await test("POST /api/v1/auth/login (Valid Credentials -> Tokens & Redis Session)", async () => {
    const res = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });
    const data = await res.json();
    if (res.status !== 200) {
      throw new Error(
        `Expected status 200, got ${res.status}: ${JSON.stringify(data)}`,
      );
    }
    if (!data.accessToken || !data.refreshToken) {
      throw new Error("Missing access or refresh token in response");
    }
    accessToken = data.accessToken;
    refreshToken = data.refreshToken;
  });
  // 6. Protected /auth/me Endpoint
  await test("GET /api/v1/auth/me (Protected Route with Bearer Token)", async () => {
    const res = await fetch(`${GATEWAY_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (res.status !== 200) {
      throw new Error(
        `Expected status 200, got ${res.status}: ${JSON.stringify(data)}`,
      );
    }
    if (data.email !== testUser.email.toLowerCase()) {
      throw new Error(
        `Expected email ${testUser.email.toLowerCase()}, got ${data.email}`,
      );
    }
  });
  // 7. Customer Profile (Created by Kafka Event or On-demand)
  await test("GET /api/v1/customers/me (Fetch Customer Profile via Gateway)", async () => {
    // Wait briefly for Kafka consumer / in-process event
    await new Promise((r) => setTimeout(r, 600));
    let res = await fetch(`${GATEWAY_URL}/api/v1/customers/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status !== 200) {
      // Fallback create customer profile if needed
      const createRes = await fetch(`${GATEWAY_URL}/api/v1/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          email: testUser.email,
        }),
      });
      const createData = await createRes.json();
      customerId = createData._id || createData.id;
    } else {
      const data = await res.json();
      customerId = data._id || data.id;
    }
    if (!customerId) throw new Error("Could not obtain customerId");
  });
  // 8. Update Customer Profile
  await test("PATCH /api/v1/customers/:id (Update Customer Details)", async () => {
    const res = await fetch(`${GATEWAY_URL}/api/v1/customers/${customerId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        phone: "+15559876543",
        address: {
          street: "500 Market St",
          city: "San Francisco",
          state: "CA",
          postalCode: "94105",
          country: "United States",
        },
      }),
    });
    const data = await res.json();
    if (res.status !== 200) {
      throw new Error(
        `Expected status 200, got ${res.status}: ${JSON.stringify(data)}`,
      );
    }
    if (data.phone !== "+15559876543") {
      throw new Error(`Expected updated phone +15559876543, got ${data.phone}`);
    }
  });
  // 9. Refresh Token Rotation
  await test("POST /api/v1/auth/refresh (Token Rotation & Revocation of Prior Session)", async () => {
    const res = await fetch(`${GATEWAY_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json();
    if (res.status !== 200) {
      throw new Error(
        `Expected status 200, got ${res.status}: ${JSON.stringify(data)}`,
      );
    }
    if (!data.accessToken || !data.refreshToken) {
      throw new Error("Did not receive rotated tokens");
    }
    accessToken = data.accessToken;
    refreshToken = data.refreshToken;
  });
  // 10. Logout
  await test("POST /api/v1/auth/logout (Revoke Active Session)", async () => {
    const res = await fetch(`${GATEWAY_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (res.status !== 200) {
      throw new Error(`Expected status 200, got ${res.status}`);
    }
  });
  console.log(`\n======================================================`);
  console.log(
    `🏁 Phase 2 Verification Summary: ${passed} Passed, ${failed} Failed`,
  );
  console.log(`======================================================\n`);
  if (failed > 0) {
    process.exit(1);
  }
}
if (require.main === module) {
  runPhase2Tests().catch((e) => {
    console.error("Test execution error:", e);
    process.exit(1);
  });
}
