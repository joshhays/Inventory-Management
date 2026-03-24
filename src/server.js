require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const prisma = require("./lib/prisma");
const app = require("./app");
const env = require("./config/env");

// Debug: log paths on startup (helps diagnose Railway deployment)
const projectRoot = path.join(__dirname, "..");
console.log("[startup] process.cwd():", process.cwd());
console.log("[startup] __dirname:", __dirname);
console.log("[startup] projectRoot:", projectRoot);
const publicAdminPath = path.join(projectRoot, "public", "admin");
const adminUiDistPath = path.join(projectRoot, "admin-ui", "dist");
console.log("[startup] public/admin path:", publicAdminPath);
console.log("[startup] public/admin exists:", fs.existsSync(publicAdminPath));
console.log("[startup] public/admin/index.html exists:", fs.existsSync(path.join(publicAdminPath, "index.html")));
if (fs.existsSync(publicAdminPath)) {
  try {
    console.log("[startup] public/admin contents:", fs.readdirSync(publicAdminPath));
  } catch (e) {
    console.log("[startup] public/admin readdir error:", e.message);
  }
}
if (fs.existsSync(adminUiDistPath)) {
  try {
    console.log("[startup] admin-ui/dist contents:", fs.readdirSync(adminUiDistPath));
  } catch (e) {
    console.log("[startup] admin-ui/dist readdir error:", e.message);
  }
}

function normalizeUsername(u) {
  return String(u).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") || "admin";
}

async function ensureAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("Admin user setup skipped. Set ADMIN_EMAIL and ADMIN_PASSWORD in Railway to create an admin.");
    return;
  }

  try {
    const emailNorm = email.toLowerCase().trim();
    const usernameNorm = normalizeUsername(process.env.ADMIN_USERNAME || email.split("@")[0]);
    const hashed = await bcrypt.hash(password, 10);
    const existing = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (existing) {
      await prisma.user.update({
        where: { email: emailNorm },
        data: { password: hashed, isAdmin: true },
      });
      console.log(`Admin user ${existing.username || emailNorm} updated.`);
    } else {
      let username = usernameNorm;
      let attempts = 0;
      while (await prisma.user.findUnique({ where: { username } })) {
        attempts++;
        username = usernameNorm + (attempts > 1 ? attempts : "");
      }
      await prisma.user.create({
        data: { username, email: emailNorm, password: hashed, isAdmin: true, isUser: true },
      });
      console.log(`Admin user ${username} created.`);
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
