const prisma = require("../lib/prisma");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

async function findByEmail(email) {
  return prisma.user.findUnique({
    where: { email: String(email).toLowerCase().trim() },
    include: {
      groups: { include: { group: true } },
    },
  });
}

async function findById(id) {
  return prisma.user.findUnique({
    where: { id: Number(id) },
    include: {
      groups: { include: { group: true } },
    },
  });
}

async function verifyPassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

function toSafeUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return {
    ...rest,
    groupIds: (user.groups || []).map((m) => m.groupId),
    groups: (user.groups || []).map((m) => m.group),
  };
}

module.exports = {
  findByEmail,
  findById,
  verifyPassword,
  hashPassword,
  toSafeUser,
};
