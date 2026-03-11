const prisma = require("../lib/prisma");
const authService = require("./auth.service");

async function findAll() {
  const users = await prisma.user.findMany({
    include: {
      groups: { include: { group: true } },
    },
    orderBy: { email: "asc" },
  });
  return users.map(authService.toSafeUser);
}

async function findById(id) {
  const user = await prisma.user.findUnique({
    where: { id: Number(id) },
    include: {
      groups: { include: { group: true } },
    },
  });
  return user ? authService.toSafeUser(user) : null;
}

async function create({ email, password, name, isAdmin, isUser, groupIds }) {
  const hashed = await authService.hashPassword(password);
  const emailNorm = String(email).toLowerCase().trim();
  const user = await prisma.user.create({
    data: {
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
    },
  });
  return authService.toSafeUser(user);
}

async function update(id, { email, password, name, isAdmin, isUser, groupIds }) {
  const existing = await prisma.user.findUnique({
    where: { id: Number(id) },
    include: { groups: true },
  });
  if (!existing) return null;

  const data = {};
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

  const user = await prisma.user.update({
    where: { id: Number(id) },
    data,
    include: {
      groups: { include: { group: true } },
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
