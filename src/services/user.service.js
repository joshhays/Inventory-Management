const prisma = require("../lib/prisma");
const authService = require("./auth.service");

function normalizeUsername(u) {
  return String(u).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

async function findAll() {
  const users = await prisma.user.findMany({
    include: {
      groups: { include: { group: true } },
      adminGroups: { include: { adminGroup: true } },
    },
    orderBy: { username: "asc" },
  });
  return users.map(authService.toSafeUser);
}

async function findById(id) {
  const user = await prisma.user.findUnique({
    where: { id: Number(id) },
    include: {
      groups: { include: { group: true } },
      adminGroups: { include: { adminGroup: true } },
    },
  });
  return user ? authService.toSafeUser(user) : null;
}

async function create({ username, email, password, name, isAdmin, isUser, groupIds, adminGroupIds }) {
  const hashed = await authService.hashPassword(password);
  const usernameNorm = normalizeUsername(username);
  const emailNorm = String(email).toLowerCase().trim();
  if (usernameNorm.length < 2) {
    throw new Error("Username must be at least 2 characters (letters, numbers, underscores, hyphens only).");
  }
  const existingUsername = await prisma.user.findUnique({ where: { username: usernameNorm } });
  if (existingUsername) {
    throw new Error("This username is already taken.");
  }
  const user = await prisma.user.create({
    data: {
      username: usernameNorm,
      email: emailNorm,
      password: hashed,
      name: name?.trim() || null,
      isAdmin: Boolean(isAdmin),
      isUser: isUser !== false,
      groups: groupIds?.length
        ? {
            create: groupIds.map((gid) => ({
              groupId: Number(gid),
            })),
          }
        : undefined,
    },
    include: {
      groups: { include: { group: true } },
      adminGroups: { include: { adminGroup: true } },
    },
  });
  if (adminGroupIds?.length) {
    await prisma.adminGroupMember.createMany({
      data: adminGroupIds.map((gid) => ({
        userId: user.id,
        adminGroupId: Number(gid),
      })),
      skipDuplicates: true,
    });
    const updated = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        groups: { include: { group: true } },
        adminGroups: { include: { adminGroup: true } },
      },
    });
    return authService.toSafeUser(updated);
  }
  return authService.toSafeUser(user);
}

async function update(id, { username, email, password, name, isAdmin, isUser, groupIds, adminGroupIds }) {
  const existing = await prisma.user.findUnique({
    where: { id: Number(id) },
    include: { groups: true },
  });
  if (!existing) return null;

  const data = {};
  if (username !== undefined) {
    const u = normalizeUsername(username);
    if (u.length >= 2) {
      const existingByUsername = await prisma.user.findFirst({
        where: { username: u, NOT: { id: Number(id) } },
      });
      if (!existingByUsername) data.username = u;
    }
  }
  if (email != null) data.email = String(email).toLowerCase().trim();
  if (name !== undefined) data.name = name?.trim() || null;
  if (isAdmin !== undefined) data.isAdmin = Boolean(isAdmin);
  if (isUser !== undefined) data.isUser = Boolean(isUser);
  if (password != null && password !== "") {
    data.password = await authService.hashPassword(password);
  }

  if (groupIds !== undefined) {
    await prisma.userGroupMember.deleteMany({
      where: { userId: Number(id) },
    });
    if (groupIds?.length) {
      await prisma.userGroupMember.createMany({
        data: groupIds.map((gid) => ({
          userId: Number(id),
          groupId: Number(gid),
        })),
      });
    }
  }

  if (adminGroupIds !== undefined) {
    await prisma.adminGroupMember.deleteMany({
      where: { userId: Number(id) },
    });
    if (adminGroupIds?.length) {
      await prisma.adminGroupMember.createMany({
        data: adminGroupIds.map((gid) => ({
          userId: Number(id),
          adminGroupId: Number(gid),
        })),
        skipDuplicates: true,
      });
    }
  }

  const user = await prisma.user.update({
    where: { id: Number(id) },
    data,
    include: {
      groups: { include: { group: true } },
      adminGroups: { include: { adminGroup: true } },
    },
  });
  return authService.toSafeUser(user);
}

async function remove(id) {
  const user = await prisma.user.findUnique({
    where: { id: Number(id) },
  });
  if (!user) return null;
  await prisma.user.delete({
    where: { id: Number(id) },
  });
  return { id: user.id };
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
};
