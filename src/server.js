require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const bcrypt = require("bcrypt");
const prisma = require("./lib/prisma");
const app = require("./app");
const env = require("./config/env");

async function ensureAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("Admin user setup skipped. Set ADMIN_EMAIL and ADMIN_PASSWORD in Railway to create an admin.");
    return;
  }

  try {
    const emailNorm = email.toLowerCase().trim();
    const hashed = await bcrypt.hash(password, 10);
    const existing = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (existing) {
      await prisma.user.update({
        where: { email: emailNorm },
        data: { password: hashed, isAdmin: true },
      });
      console.log(`Admin user ${emailNorm} updated.`);
    } else {
      await prisma.user.create({
        data: { email: emailNorm, password: hashed, isAdmin: true, isUser: true },
      });
      console.log(`Admin user ${emailNorm} created.`);
    }
  } catch (e) {
    console.error("Failed to ensure admin user:", e.message);
  }
}

async function start() {
  await ensureAdminUser();
  app.listen(env.port, () => {
    console.log(`Inventory API listening on port ${env.port}`);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
