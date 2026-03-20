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

async function create({ name, slug, logoUrl, brandColor1, brandColor2, customerInfo, shippingEnabled }) {
  return prisma.deployment.create({
    data: {
      name: String(name).trim(),
      slug: String(slug).trim().toLowerCase().replace(/\s+/g, "-"),
      logoUrl: logoUrl ? String(logoUrl).trim() : null,
      brandColor1: brandColor1 ? String(brandColor1).trim() || null : null,
      brandColor2: brandColor2 ? String(brandColor2).trim() || null : null,
      customerInfo: customerInfo != null ? String(customerInfo).trim() || null : null,
      shippingEnabled: shippingEnabled !== false,
    },
  });
}

async function update(id, { name, slug, logoUrl, brandColor1, brandColor2, customerInfo, shippingEnabled, adminAccessConfig }) {
  const data = {};
  if (name != null) data.name = String(name).trim();
  if (slug != null) data.slug = String(slug).trim().toLowerCase().replace(/\s+/g, "-");
  if (logoUrl !== undefined) data.logoUrl = logoUrl ? String(logoUrl).trim() : null;
  if (brandColor1 !== undefined) data.brandColor1 = brandColor1 ? String(brandColor1).trim() || null : null;
  if (brandColor2 !== undefined) data.brandColor2 = brandColor2 ? String(brandColor2).trim() || null : null;
  if (customerInfo !== undefined) data.customerInfo = customerInfo ? String(customerInfo).trim() : null;
  if (shippingEnabled !== undefined) data.shippingEnabled = shippingEnabled !== false;
  if (adminAccessConfig !== undefined) data.adminAccessConfig = adminAccessConfig ? JSON.stringify(adminAccessConfig) : null;
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
