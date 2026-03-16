#!/usr/bin/env node
/**
 * Create an initial admin user.
 * Usage: node scripts/seed-admin.js [email] [password]
 * Example: node scripts/seed-admin.js admin@example.com mypassword
 *
 * If no args, uses ADMIN_EMAIL and ADMIN_PASSWORD from env, or prompts.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const readline = require("readline");
const prisma = require("../src/lib/prisma");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function main() {
  let email = process.argv[2] || process.env.ADMIN_EMAIL;
  let password = process.argv[3] || process.env.ADMIN_PASSWORD;

  if (!email) {
    email = await prompt("Admin email: ");
  }
  if (!password) {
    password = await prompt("Admin password: ");
  }

  if (!email || !password) {
    console.error("Email and password are required.");
    process.exit(1);
  }

  const emailNorm = email.toLowerCase().trim();
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  const existing = await prisma.user.findUnique({
    where: { email: emailNorm },
  });

  if (existing) {
    await prisma.user.update({
      where: { email: emailNorm },
      data: { password: hashed, isAdmin: true },
    });
    console.log(`Updated existing user ${emailNorm} as admin.`);
  } else {
    await prisma.user.create({
      data: {
        email: emailNorm,
        password: hashed,
        isAdmin: true,
        isUser: true,
      },
    });
    console.log(`Created admin user ${emailNorm}.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
