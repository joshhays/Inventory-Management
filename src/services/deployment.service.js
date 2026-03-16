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

async function create({ name, slug, logoUrl, customerInfo }) {
  return prisma.deployment.create({
    data: {
      name: String(name).trim(),
      slug: String(slug).trim().toLowerCase().replace(/\s+/g, "-"),
      logoUrl: logoUrl ? String(logoUrl).trim() : null,
      customerInfo: customerInfo != null ? String(customerInfo).trim() || null : null,
    },
  });
}

async function update(id, { name, slug, logoUrl, customerInfo }) {
  const data = {};
  if (name != null) data.name = String(name).trim();
  if (slug != null) data.slug = String(slug).trim().toLowerCase().replace(/\s+/g, "-");
  if (logoUrl !== undefined) data.logoUrl = logoUrl ? String(logoUrl).trim() : null;
  if (customerInfo !== undefined) data.customerInfo = customerInfo ? String(customerInfo).trim() : null;
  if (Object.keys(data).length === 0) return findById(id);
  return prisma.deployment.update({
    where: { id: Number(id) },
    data,
  });
}

module.exports = {
  findAll,
  findById,
  findBySlug,
  create,
  update,
};
