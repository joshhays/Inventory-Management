const prisma = require("../lib/prisma");

function findAll(deploymentId) {
  const where = deploymentId != null ? { deploymentId: Number(deploymentId) } : {};
  return prisma.adminGroup.findMany({
    where,
    include: { members: { include: { user: true } } },
    orderBy: { name: "asc" },
  });
}

function create({ deploymentId, name, permissions = {} }) {
  if (!deploymentId) throw new Error("Deployment is required.");
  return prisma.adminGroup.create({
    data: {
      deploymentId: Number(deploymentId),
      name: String(name).trim(),
      permissions: JSON.stringify(permissions),
    },
  });
}

function findById(id, deploymentId) {
  const where = { id: Number(id) };
  if (deploymentId != null) where.deploymentId = Number(deploymentId);
  return prisma.adminGroup.findFirst({
    where,
    include: { members: { include: { user: true } } },
  });
}

async function update(id, { name, permissions }, deploymentId) {
  const where = { id: Number(id) };
  if (deploymentId != null) where.deploymentId = Number(deploymentId);
  const g = await prisma.adminGroup.findFirst({ where });
  if (!g) return null;
  const data = {};
  if (name !== undefined) data.name = String(name).trim();
  if (permissions !== undefined) data.permissions = JSON.stringify(permissions);
  return prisma.adminGroup.update({
    where: { id: Number(id) },
    data,
    include: { members: { include: { user: true } } },
  });
}

async function remove(id, deploymentId) {
  const where = { id: Number(id) };
  if (deploymentId != null) where.deploymentId = Number(deploymentId);
  const g = await prisma.adminGroup.findFirst({ where });
  if (!g) return null;
  await prisma.adminGroupMember.deleteMany({ where: { adminGroupId: Number(id) } });
  await prisma.notificationTemplateRecipient.deleteMany({ where: { adminGroupId: Number(id) } });
  await prisma.adminGroup.delete({ where: { id: Number(id) } });
  return { id: g.id };
}

async function addMember(adminGroupId, userId, deploymentId) {
  const where = { id: Number(adminGroupId) };
  if (deploymentId != null) where.deploymentId = Number(deploymentId);
  const g = await prisma.adminGroup.findFirst({ where });
  if (!g) return null;
  const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
  if (!user || !user.isAdmin) return null;
  await prisma.adminGroupMember.upsert({
    where: { userId_adminGroupId: { userId: Number(userId), adminGroupId: Number(adminGroupId) } },
    create: { userId: Number(userId), adminGroupId: Number(adminGroupId) },
    update: {},
  });
  return findById(adminGroupId, deploymentId);
}

async function removeMember(adminGroupId, userId, deploymentId) {
  const where = { id: Number(adminGroupId) };
  if (deploymentId != null) where.deploymentId = Number(deploymentId);
  const g = await prisma.adminGroup.findFirst({ where });
  if (!g) return null;
  await prisma.adminGroupMember.deleteMany({
    where: { adminGroupId: Number(adminGroupId), userId: Number(userId) },
  });
  return findById(adminGroupId, deploymentId);
}

module.exports = {
  findAll,
  create,
  findById,
  update,
  remove,
  addMember,
  removeMember,
};
