/**
 * Seed a System User for stress testing
 * ──────────────────────────────────────
 * Creates a system user (systemUser: true) with its own account,
 * and seeds unlimited funds via a direct ledger credit entry.
 *
 * USAGE:  node tests/seed-system-user.js
 *
 * Outputs the system user's JWT token for use with the stress test.
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const isLocalDb = process.env.DATABASE_URL?.includes("localhost") || process.env.DATABASE_URL?.includes("127.0.0.1");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ...(isLocalDb ? {} : { ssl: { rejectUnauthorized: false } }),
});

const prisma = new PrismaClient({ adapter });

const SYSTEM_EMAIL = "system@fintrace.test";
const SYSTEM_PASSWORD = "SystemPass123!";
const SEED_AMOUNT = 1_000_000; // ₹10,00,000 seed money

async function main() {
  console.log("\n  🔧  Seeding system user...\n");

  // Check if system user already exists
  let user = await prisma.user.findUnique({ where: { email: SYSTEM_EMAIL } });

  if (user) {
    console.log("  ℹ️   System user already exists, skipping creation.");
  } else {
    const hashedPassword = await bcrypt.hash(SYSTEM_PASSWORD, 10);
    user = await prisma.user.create({
      data: {
        email: SYSTEM_EMAIL,
        name: "System Bank",
        password: hashedPassword,
        systemUser: true,
      },
    });
    console.log("  ✅  System user created");
  }

  // Ensure systemUser flag is set
  if (!user.systemUser) {
    await prisma.user.update({
      where: { id: user.id },
      data: { systemUser: true },
    });
    console.log("  ✅  systemUser flag set to true");
  }

  // Check if system account exists
  let account = await prisma.account.findFirst({
    where: { userId: user.id },
  });

  if (!account) {
    account = await prisma.account.create({
      data: { userId: user.id },
    });
    console.log("  ✅  System account created");
  } else {
    console.log("  ℹ️   System account already exists");
  }

  // Seed funds via a direct ledger credit (no matching debit — this is the "mint")
  // Check current balance first
  const result = await prisma.$queryRaw`
    SELECT
      COALESCE(SUM(CASE WHEN "type" = 'CREDITED' THEN amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN "type" = 'DEBITED'  THEN amount ELSE 0 END), 0) AS balance
    FROM ledger_entries
    WHERE "accountId" = ${account.id}
  `;
  const currentBalance = Number(result[0].balance);

  if (currentBalance < SEED_AMOUNT) {
    const topUp = SEED_AMOUNT - currentBalance;
    // Create a self-referencing transaction for the mint operation
    const mintTx = await prisma.transaction.create({
      data: {
        fromAccountId: account.id,
        toAccountId: account.id,
        amount: topUp,
        idempotencyKey: `system-mint-${Date.now()}`,
        status: "COMPLETED",
      },
    });
    await prisma.ledgerEntry.create({
      data: {
        accountId: account.id,
        transactionId: mintTx.id,
        amount: topUp,
        type: "CREDITED",
      },
    });
    console.log(`  ✅  Seeded ₹${topUp.toLocaleString()} into system account`);
  } else {
    console.log(`  ℹ️   System account already has ₹${currentBalance.toLocaleString()}`);
  }

  // Generate JWT token
  const token = jwt.sign({ userID: user.id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  console.log("\n  ────────────────────────────────────────────");
  console.log(`  📧  Email:    ${SYSTEM_EMAIL}`);
  console.log(`  🔑  Password: ${SYSTEM_PASSWORD}`);
  console.log(`  🏦  Account:  ${account.id}`);
  console.log(`  🪙  Balance:  ₹${SEED_AMOUNT.toLocaleString()}`);
  console.log("  ────────────────────────────────────────────");
  console.log(`\n  🔐  SYSTEM_TOKEN (copy this):\n`);
  console.log(`  ${token}`);
  console.log(`\n  Run the stress test with:\n`);
  console.log(`  $env:SYSTEM_EMAIL="${SYSTEM_EMAIL}"; $env:SYSTEM_PASSWORD="${SYSTEM_PASSWORD}"; node tests/acid-stress-test.js`);
  console.log();

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("  ❌  Error:", err);
  await prisma.$disconnect();
  process.exit(1);
});
