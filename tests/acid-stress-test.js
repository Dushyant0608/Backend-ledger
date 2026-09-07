/**
 * FinTrace ACID Stress Test
 * ─────────────────────────
 * Fires 50 simultaneous transfer requests at the transaction pipeline
 * and verifies zero deadlocks + zero double-spends.
 *
 * PREREQUISITES:
 *   1. Server running on http://localhost:3000
 *   2. PostgreSQL & Redis connected
 *   3. A system user already exists (systemUser: true) — OR set CREATE_SYSTEM_USER=true
 *
 * USAGE:
 *   node tests/acid-stress-test.js
 *
 * WHAT IT DOES:
 *   Phase 1 — Setup: Register 2 test users, create accounts, fund each with ₹10,000
 *   Phase 2 — Storm: Fire N concurrent transfers (A→B and B→A simultaneously)
 *   Phase 3 — Audit: Verify total money in the system is unchanged (conservation law)
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";
const CONCURRENT_REQUESTS = 50; // number of simultaneous transfers
const TRANSFER_AMOUNT = 10;     // ₹10 per transfer
const INITIAL_FUND = 10000;     // ₹10,000 per account

// ─── Helpers ────────────────────────────────────────────────────────────────

async function post(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get("content-type") || "";
  let data;
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    const text = await res.text();
    data = { message: `Non-JSON response: ${text.substring(0, 200)}` };
  }
  return { status: res.status, data };
}

async function get(path, token) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  const contentType = res.headers.get("content-type") || "";
  let data;
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    const text = await res.text();
    data = { message: `Non-JSON response: ${text.substring(0, 200)}` };
  }
  return { status: res.status, data };
}

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ─── Pretty Logging ─────────────────────────────────────────────────────────

const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function log(icon, msg) {
  console.log(`  ${icon}  ${msg}`);
}

// ─── Main Test ──────────────────────────────────────────────────────────────

async function main() {
  console.log();
  console.log(`${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║       FinTrace ACID Stress Test                  ║${RESET}`);
  console.log(`${BOLD}${CYAN}║       ${CONCURRENT_REQUESTS} concurrent transfers — zero tolerance     ║${RESET}`);
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${RESET}`);
  console.log();

  // ── Phase 1: Setup ──────────────────────────────────────────────────────

  console.log(`${BOLD}Phase 1: Setup${RESET}`);
  console.log(`${DIM}─────────────────────────────────────${RESET}`);

  const ts = Date.now();
  const userAEmail = `stress_a_${ts}@test.com`;
  const userBEmail = `stress_b_${ts}@test.com`;
  const password = "StressTest123!";

  // Register User A
  const regA = await post("/api/auth/register", {
    name: "Stress User A",
    email: userAEmail,
    password,
  });
  if (regA.status !== 201) {
    log("❌", `${RED}Failed to register User A: ${JSON.stringify(regA.data)}${RESET}`);
    process.exit(1);
  }
  const tokenA = regA.data.token;
  log("✅", `User A registered ${DIM}(${userAEmail})${RESET}`);

  // Register User B
  const regB = await post("/api/auth/register", {
    name: "Stress User B",
    email: userBEmail,
    password,
  });
  if (regB.status !== 201) {
    log("❌", `${RED}Failed to register User B: ${JSON.stringify(regB.data)}${RESET}`);
    process.exit(1);
  }
  const tokenB = regB.data.token;
  log("✅", `User B registered ${DIM}(${userBEmail})${RESET}`);

  // Create Account A
  const accA = await post("/api/account/", {}, tokenA);
  if (accA.status !== 201) {
    log("❌", `${RED}Failed to create Account A: ${JSON.stringify(accA.data)}${RESET}`);
    process.exit(1);
  }
  const accountAId = accA.data.account.id;
  log("✅", `Account A created ${DIM}(${accountAId})${RESET}`);

  // Create Account B
  const accB = await post("/api/account/", {}, tokenB);
  if (accB.status !== 201) {
    log("❌", `${RED}Failed to create Account B: ${JSON.stringify(accB.data)}${RESET}`);
    process.exit(1);
  }
  const accountBId = accB.data.account.id;
  log("✅", `Account B created ${DIM}(${accountBId})${RESET}`);

  // Fund accounts via system user
  // NOTE: You need a system user token. Set SYSTEM_TOKEN env var or the script
  //       will try to login with SYSTEM_EMAIL / SYSTEM_PASSWORD env vars.
  let systemToken = process.env.SYSTEM_TOKEN;
  if (!systemToken) {
    const sysEmail = process.env.SYSTEM_EMAIL;
    const sysPassword = process.env.SYSTEM_PASSWORD;
    if (!sysEmail || !sysPassword) {
      log("⚠️ ", `${YELLOW}No SYSTEM_TOKEN or SYSTEM_EMAIL/SYSTEM_PASSWORD set.${RESET}`);
      log("⚠️ ", `${YELLOW}Skipping initial funding. Make sure accounts already have funds.${RESET}`);
      log("⚠️ ", `${YELLOW}Set env vars: SYSTEM_TOKEN=<jwt> or SYSTEM_EMAIL + SYSTEM_PASSWORD${RESET}`);
    } else {
      const sysLogin = await post("/api/auth/login", {
        email: sysEmail,
        password: sysPassword,
      });
      if (sysLogin.status !== 200) {
        log("❌", `${RED}System user login failed: ${JSON.stringify(sysLogin.data)}${RESET}`);
        process.exit(1);
      }
      systemToken = sysLogin.data.token;
      log("✅", `System user authenticated`);
    }
  }

  if (systemToken) {
    // Fund Account A
    const fundA = await post(
      "/api/transaction/system/initial-fund",
      { toAccount: accountAId, amount: INITIAL_FUND, idempotencyKey: uuid() },
      systemToken
    );
    if (fundA.status !== 201) {
      log("❌", `${RED}Failed to fund Account A: ${JSON.stringify(fundA.data)}${RESET}`);
      process.exit(1);
    }
    log("✅", `Account A funded with ₹${INITIAL_FUND.toLocaleString()}`);

    // Fund Account B
    const fundB = await post(
      "/api/transaction/system/initial-fund",
      { toAccount: accountBId, amount: INITIAL_FUND, idempotencyKey: uuid() },
      systemToken
    );
    if (fundB.status !== 201) {
      log("❌", `${RED}Failed to fund Account B: ${JSON.stringify(fundB.data)}${RESET}`);
      process.exit(1);
    }
    log("✅", `Account B funded with ₹${INITIAL_FUND.toLocaleString()}`);
  }

  // Check starting balances
  const balA_before = await get(`/api/account/balance/${accountAId}`, tokenA);
  const balB_before = await get(`/api/account/balance/${accountBId}`, tokenB);
  const startA = Number(balA_before.data.balance);
  const startB = Number(balB_before.data.balance);
  const totalBefore = startA + startB;

  log("💰", `Starting balance A: ₹${startA.toLocaleString()}`);
  log("💰", `Starting balance B: ₹${startB.toLocaleString()}`);
  log("💰", `${BOLD}Total money in system: ₹${totalBefore.toLocaleString()}${RESET}`);

  if (totalBefore === 0) {
    log("❌", `${RED}Both accounts have zero balance. Fund them first!${RESET}`);
    process.exit(1);
  }

  console.log();

  // ── Phase 2: Storm ──────────────────────────────────────────────────────

  console.log(`${BOLD}Phase 2: Firing ${CONCURRENT_REQUESTS} concurrent transfers${RESET}`);
  console.log(`${DIM}─────────────────────────────────────${RESET}`);

  // Build requests: alternate A→B and B→A to maximize deadlock risk
  const requests = [];
  for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
    const isAtoB = i % 2 === 0;
    requests.push({
      fromAccount: isAtoB ? accountAId : accountBId,
      toAccount: isAtoB ? accountBId : accountAId,
      amount: TRANSFER_AMOUNT,
      idempotencyKey: uuid(),
      token: isAtoB ? tokenA : tokenB,
      direction: isAtoB ? "A→B" : "B→A",
      index: i,
    });
  }

  const startTime = performance.now();

  // Fire all at once
  const results = await Promise.allSettled(
    requests.map((r) =>
      post(
        "/api/transaction/",
        {
          fromAccount: r.fromAccount,
          toAccount: r.toAccount,
          amount: r.amount,
          idempotencyKey: r.idempotencyKey,
        },
        r.token
      ).then((res) => ({ ...res, direction: r.direction, index: r.index }))
    )
  );

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);

  // Tally results
  let succeeded = 0;
  let failed = 0;
  let rateLimited = 0;
  let errors = 0;
  const failures = [];

  for (const result of results) {
    if (result.status === "rejected") {
      errors++;
      failures.push({ error: result.reason?.message || "Promise rejected" });
      continue;
    }
    const { status, data, direction, index } = result.value;
    if (status === 201) {
      succeeded++;
    } else if (status === 429) {
      rateLimited++;
    } else {
      failed++;
      failures.push({ index, direction, status, message: data?.message });
    }
  }

  log("⚡", `Completed in ${BOLD}${elapsed}s${RESET}`);
  log("✅", `${GREEN}Succeeded: ${succeeded}${RESET}`);
  if (rateLimited > 0) {
    log("⏳", `${YELLOW}Rate-limited (429): ${rateLimited}${RESET} ${DIM}(not failures — rate limiter working as designed)${RESET}`);
  }
  if (failed > 0) {
    log("❌", `${RED}Failed: ${failed}${RESET}`);
    for (const f of failures.slice(0, 5)) {
      log("  ", `${DIM}${JSON.stringify(f)}${RESET}`);
    }
  }
  if (errors > 0) {
    log("💥", `${RED}Network/promise errors: ${errors}${RESET}`);
  }

  console.log();

  // ── Phase 3: Audit ─────────────────────────────────────────────────────

  console.log(`${BOLD}Phase 3: ACID Verification${RESET}`);
  console.log(`${DIM}─────────────────────────────────────${RESET}`);

  const balA_after = await get(`/api/account/balance/${accountAId}`, tokenA);
  const balB_after = await get(`/api/account/balance/${accountBId}`, tokenB);
  const endA = Number(balA_after.data.balance);
  const endB = Number(balB_after.data.balance);
  const totalAfter = endA + endB;

  log("💰", `Final balance A: ₹${endA.toLocaleString()}`);
  log("💰", `Final balance B: ₹${endB.toLocaleString()}`);
  log("💰", `${BOLD}Total money in system: ₹${totalAfter.toLocaleString()}${RESET}`);

  console.log();

  // ── Verdicts ───────────────────────────────────────────────────────────

  console.log(`${BOLD}Results${RESET}`);
  console.log(`${DIM}─────────────────────────────────────${RESET}`);

  // Check 1: Money conservation (no double-spend)
  const conserved = totalBefore === totalAfter;
  if (conserved) {
    log("✅", `${GREEN}${BOLD}MONEY CONSERVATION: PASS${RESET} — ₹${totalBefore.toLocaleString()} before = ₹${totalAfter.toLocaleString()} after`);
  } else {
    log("❌", `${RED}${BOLD}MONEY CONSERVATION: FAIL${RESET} — ₹${totalBefore.toLocaleString()} before ≠ ₹${totalAfter.toLocaleString()} after`);
    log("  ", `${RED}DOUBLE-SPEND DETECTED: ₹${Math.abs(totalAfter - totalBefore)} discrepancy${RESET}`);
  }

  // Check 2: No deadlocks (no network errors / promise rejections)
  const noDeadlocks = errors === 0;
  if (noDeadlocks) {
    log("✅", `${GREEN}${BOLD}DEADLOCK TEST: PASS${RESET} — 0 network/timeout errors in ${CONCURRENT_REQUESTS} concurrent requests`);
  } else {
    log("❌", `${RED}${BOLD}DEADLOCK TEST: FAIL${RESET} — ${errors} promise rejections (possible deadlock timeouts)`);
  }

  // Check 3: No negative balances
  const noNegative = endA >= 0 && endB >= 0;
  if (noNegative) {
    log("✅", `${GREEN}${BOLD}NO NEGATIVE BALANCES: PASS${RESET} — A: ₹${endA}, B: ₹${endB}`);
  } else {
    log("❌", `${RED}${BOLD}NEGATIVE BALANCE: FAIL${RESET} — A: ₹${endA}, B: ₹${endB}`);
  }

  // Summary
  console.log();
  const allPassed = conserved && noDeadlocks && noNegative;
  if (allPassed) {
    console.log(`  ${GREEN}${BOLD}═══════════════════════════════════════${RESET}`);
    console.log(`  ${GREEN}${BOLD}  ALL ACID CHECKS PASSED ✅            ${RESET}`);
    console.log(`  ${GREEN}${BOLD}  ${succeeded}/${CONCURRENT_REQUESTS} transfers succeeded           ${RESET}`);
    console.log(`  ${GREEN}${BOLD}  0 deadlocks · 0 double-spends        ${RESET}`);
    console.log(`  ${GREEN}${BOLD}═══════════════════════════════════════${RESET}`);
  } else {
    console.log(`  ${RED}${BOLD}═══════════════════════════════════════${RESET}`);
    console.log(`  ${RED}${BOLD}  ACID VIOLATIONS DETECTED ❌           ${RESET}`);
    console.log(`  ${RED}${BOLD}═══════════════════════════════════════${RESET}`);
  }

  console.log();
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error(`\n${RED}Fatal error:${RESET}`, err);
  process.exit(1);
});
