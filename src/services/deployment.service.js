const prisma = require("../lib/prisma");

async function findAll() {
  return prisma.deployment.findMany({
    orderBy: { name: "asc" },
  });
}

async function findById(id) {
  return prisma.deployment.findUnique({
    where: { id: Number(id) },
  });
}

async function findBySlug(slug) {
  return prisma.deployment.findUnique({
    where: { slug: String(slug) },
  });
}

async function create({ name, slug, logoUrl }) {
  return prisma.deployment.create({
    data: {
      name: String(name).trim(),
      slug: String(slug).trim().toLowerCase().replace(/\s+/g, "-"),
      logoUrl: logoUrl ? String(logoUrl).trim() : null,
    },
  });
}

module.exports = {
  findAll,
  findById,
  findBySlug,
  create,
};
