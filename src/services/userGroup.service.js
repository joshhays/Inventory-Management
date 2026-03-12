const prisma = require("../lib/prisma");

function findAll() {
  return prisma.userGroup.findMany({
    include: { products: true },
    orderBy: { name: "asc" },
  });
}

function create({ name }) {
  return prisma.userGroup.create({
    data: { name: String(name).trim() },
  });
}

function findById(id) {
  return prisma.userGroup.findUnique({
    where: { id: Number(id) },
    include: { products: true },
  });
}

async function update(id, { name }) {
  const g = await prisma.userGroup.findUnique({ where: { id: Number(id) } });
  if (!g) return null;
  return prisma.userGroup.update({
    where: { id: Number(id) },
    data: { name: String(name).trim() },
    include: { products: true },
  });
}

async function remove(id) {
  const g = await prisma.userGroup.findUnique({ where: { id: Number(id) } });
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
