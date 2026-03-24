const crypto = require("crypto");
const prisma = require("../lib/prisma");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

async function findByEmail(email) {
  return prisma.user.findUnique({
    where: { email: String(email).toLowerCase().trim() },
    include: {
      groups: { include: { group: true } },
      adminGroups: { include: { adminGroup: true } },
    },
  });
}

async function findByUsername(username) {
  if (!username || typeof username !== "string") return null;
  const u = String(username).trim().toLowerCase();
  return prisma.user.findUnique({
    where: { username: u },
    include: {
      groups: { include: { group: true } },
      adminGroups: { include: { adminGroup: true } },
    },
  });
}

async function findById(id) {
  return prisma.user.findUnique({
    where: { id: Number(id) },
    include: {
      groups: { include: { group: true } },
      adminGroups: { include: { adminGroup: true } },
    },
  });
}

async function verifyPassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

async function createPasswordResetToken(email) {
  const user = await findByEmail(email);
  if (!user) return null;

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpires: expires },
  });

  return { token, user };
}

async function findUserByResetToken(token) {
  if (!token || typeof token !== "string" || token.length < 32) return null;
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: { gt: new Date() },
    },
  });
  return user;
}

async function clearPasswordReset(userId) {
  await prisma.user.update({
    where: { id: Number(userId) },
    data: { passwordResetToken: null, passwordResetExpires: null },
  });
}

function toSafeUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  const groupIds = (user.groups || []).map((m) => m.groupId);
  const adminGroups = (user.adminGroups || []).map((m) => m.adminGroup).filter(Boolean);
  const permissions = {
    canApproveOrders: user.isAdmin || adminGroups.some((g) => g?.canApproveOrders === true),
    canManageInventory: user.isAdmin || adminGroups.some((g) => g?.canManageInventory === true),
    canEditUsers: user.isAdmin || adminGroups.some((g) => g?.canEditUsers === true),
  };
  return {
    ...rest,
    groupIds,
    groups: (user.groups || []).map((m) => m.group),
    adminGroupIds: adminGroups.map((g) => g.id),
    permissions,
  };
}

module.exports = {
  findByEmail,
  findByUsername,
  findById,
  verifyPassword,
  hashPassword,
  createPasswordResetToken,
  findUserByResetToken,
  clearPasswordReset,
  toSafeUser,
};
