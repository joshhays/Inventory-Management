const prisma = require("../lib/prisma");

function findAll(deploymentId) {
  const where = deploymentId != null ? { deploymentId: Number(deploymentId) } : {};
  return prisma.userGroup.findMany({
    where,
    include: { products: true },
    orderBy: { name: "asc" },
  });
}

function create({ deploymentId, name }) {
  if (!deploymentId) throw new Error("Deployment is required.");
  return prisma.userGroup.create({
    data: {
      deploymentId: Number(deploymentId),
      name: String(name).trim(),
    },
  });
}

function findById(id, deploymentId) {
  const where = { id: Number(id) };
  if (deploymentId != null) where.deploymentId = Number(deploymentId);
  return prisma.userGroup.findFirst({
    where,
    include: { products: true },
  });
}

async function update(id, { name }, deploymentId) {
  const where = { id: Number(id) };
  if (deploymentId != null) where.deploymentId = Number(deploymentId);
  const g = await prisma.userGroup.findFirst({ where });
  if (!g) return null;
  return prisma.userGroup.update({
    where: { id: Number(id) },
    data: { name: String(name).trim() },
    include: { products: true },
  });
}

async function remove(id, deploymentId) {
  const where = { id: Number(id) };
  if (deploymentId != null) where.deploymentId = Number(deploymentId);
  const g = await prisma.userGroup.findFirst({ where });
  if (!g) return null;
  await prisma.product.updateMany({
    where: { groupId: Number(id) },
    data: { groupId: null },
  });
  await prisma.userGroupMember.deleteMany({ where: { groupId: Number(id) } });
  await prisma.userGroup.delete({ where: { id: Number(id) } });
  return { id: g.id };
}

module.exports = {
  findAll,
  create,
  findById,
  update,
  remove,
};
