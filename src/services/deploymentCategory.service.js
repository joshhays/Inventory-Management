const prisma = require("../lib/prisma");

async function findByDeployment(deploymentId) {
  return prisma.deploymentCategory.findMany({
    where: { deploymentId: Number(deploymentId) },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

async function create(deploymentId, { name, sortOrder }) {
  let order = sortOrder != null ? Number(sortOrder) : null;
  if (order == null) {
    const last = await prisma.deploymentCategory.findFirst({
      where: { deploymentId: Number(deploymentId) },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    order = last ? last.sortOrder + 1 : 0;
  }
  const data = {
    deploymentId: Number(deploymentId),
    name: String(name).trim(),
    sortOrder: order,
  };
  return prisma.deploymentCategory.create({ data });
}

async function update(id, deploymentId, { name, sortOrder }) {
  const existing = await findById(id, deploymentId);
  if (!existing) throw new Error("Category not found");
  const data = {};
  if (name !== undefined) data.name = String(name).trim();
  if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);
  if (Object.keys(data).length === 0) return existing;
  return prisma.deploymentCategory.update({
    where: { id: Number(id) },
    data,
  });
}

async function remove(id, deploymentId) {
  const existing = await findById(id, deploymentId);
  if (!existing) throw new Error("Category not found");
  return prisma.deploymentCategory.delete({
    where: { id: Number(id) },
  });
}

async function findById(id, deploymentId) {
  return prisma.deploymentCategory.findFirst({
    where: { id: Number(id), deploymentId: Number(deploymentId) },
  });
}

/** Returns category names for a deployment, ordered by sortOrder. Used by storefront. */
async function getCategoryNamesForDeployment(deploymentId) {
  const cats = await findByDeployment(deploymentId);
  return cats.map((c) => c.name);
}

module.exports = {
  findByDeployment,
  getCategoryNamesForDeployment,
  create,
  update,
  remove,
  findById,
};
