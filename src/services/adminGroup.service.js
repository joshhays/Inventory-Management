const prisma = require("../lib/prisma");
const { Prisma } = require("@prisma/client");

const hasAdminGroup = () => typeof prisma.adminGroup?.create === "function";

async function findAll(deploymentId) {
  if (!hasAdminGroup()) {
    return findAllRaw(deploymentId);
  }
  const where = deploymentId != null ? { deploymentId: Number(deploymentId) } : {};
  return prisma.adminGroup.findMany({
    where,
    include: { members: { include: { user: true } } },
    orderBy: { name: "asc" },
  });
}

async function findAllRaw(deploymentId) {
  const rows =
    deploymentId != null
      ? await prisma.$queryRaw(Prisma.sql`SELECT * FROM "AdminGroup" WHERE "deploymentId" = ${Number(deploymentId)} ORDER BY name ASC`)
      : await prisma.$queryRaw(Prisma.sql`SELECT * FROM "AdminGroup" ORDER BY name ASC`);
  return rows.map((r) => ({ ...r, members: [] }));
}

function create({ deploymentId, name, permissions = {} }) {
  if (!deploymentId) throw new Error("Deployment is required.");
  if (!hasAdminGroup()) {
    return createRaw({ deploymentId, name, permissions });
  }
  return prisma.adminGroup.create({
    data: {
      deploymentId: Number(deploymentId),
      name: String(name).trim(),
      permissions: JSON.stringify(permissions),
    },
  });
}

async function createRaw({ deploymentId, name, permissions = {} }) {
  const perms = JSON.stringify(permissions);
  const [row] = await prisma.$queryRaw(Prisma.sql`
    INSERT INTO "AdminGroup" (name, "deploymentId", permissions)
    VALUES (${String(name).trim()}, ${Number(deploymentId)}, ${perms})
    RETURNING *
  `);
  return row ? { ...row, members: [] } : null;
}

async function findById(id, deploymentId) {
  if (!hasAdminGroup()) {
    return findByIdRaw(id, deploymentId);
  }
  const where = { id: Number(id) };
  if (deploymentId != null) where.deploymentId = Number(deploymentId);
  return prisma.adminGroup.findFirst({
    where,
    include: { members: { include: { user: true } } },
  });
}

async function findByIdRaw(id, deploymentId) {
  const rows =
    deploymentId != null
      ? await prisma.$queryRaw(Prisma.sql`SELECT * FROM "AdminGroup" WHERE id = ${Number(id)} AND "deploymentId" = ${Number(deploymentId)}`)
      : await prisma.$queryRaw(Prisma.sql`SELECT * FROM "AdminGroup" WHERE id = ${Number(id)}`);
  const row = rows[0];
  return row ? { ...row, members: [] } : null;
}

async function update(id, { name, permissions }, deploymentId) {
  if (!hasAdminGroup()) {
    return updateRaw(id, { name, permissions }, deploymentId);
  }
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

async function updateRaw(id, { name, permissions }, deploymentId) {
  const g = await findByIdRaw(id, deploymentId);
  if (!g) return null;
  const updates = [];
  const values = [];
  let i = 1;
  if (name !== undefined) {
    updates.push(`name = $${i++}`);
    values.push(String(name).trim());
  }
  if (permissions !== undefined) {
    updates.push(`permissions = $${i++}`);
    values.push(JSON.stringify(permissions));
  }
  if (updates.length === 0) return g;
  const idParam = `$${i}`;
  values.push(Number(id));
  const [row] = await prisma.$queryRawUnsafe(
    `UPDATE "AdminGroup" SET ${updates.join(", ")} WHERE id = ${idParam} RETURNING *`,
    ...values
  );
  return row ? { ...row, members: [] } : g;
}

async function remove(id, deploymentId) {
  if (!hasAdminGroup()) {
    return removeRaw(id, deploymentId);
  }
  const where = { id: Number(id) };
  if (deploymentId != null) where.deploymentId = Number(deploymentId);
  const g = await prisma.adminGroup.findFirst({ where });
  if (!g) return null;
  await prisma.adminGroupMember.deleteMany({ where: { adminGroupId: Number(id) } });
  await prisma.notificationTemplateRecipient.deleteMany({ where: { adminGroupId: Number(id) } });
  await prisma.adminGroup.delete({ where: { id: Number(id) } });
  return { id: g.id };
}

async function removeRaw(id, deploymentId) {
  const g = await findByIdRaw(id, deploymentId);
  if (!g) return null;
  await prisma.$executeRawUnsafe(`DELETE FROM "AdminGroupMember" WHERE "adminGroupId" = $1`, Number(id));
  await prisma.$executeRawUnsafe(`DELETE FROM "NotificationTemplateRecipient" WHERE "adminGroupId" = $1`, Number(id));
  await prisma.$executeRawUnsafe(`DELETE FROM "AdminGroup" WHERE id = $1`, Number(id));
  return { id: g.id };
}

async function addMember(adminGroupId, userId, deploymentId) {
  if (!hasAdminGroup() || typeof prisma.adminGroupMember?.upsert !== "function") {
    return addMemberRaw(adminGroupId, userId, deploymentId);
  }
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

async function addMemberRaw(adminGroupId, userId, deploymentId) {
  const g = await findById(adminGroupId, deploymentId);
  if (!g) return null;
  const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
  if (!user || !user.isAdmin) return null;
  await prisma.$executeRawUnsafe(
    `INSERT INTO "AdminGroupMember" ("userId", "adminGroupId") VALUES ($1, $2) ON CONFLICT ("userId", "adminGroupId") DO NOTHING`,
    Number(userId),
    Number(adminGroupId)
  );
  return findById(adminGroupId, deploymentId);
}

async function removeMember(adminGroupId, userId, deploymentId) {
  if (!hasAdminGroup() || typeof prisma.adminGroupMember?.deleteMany !== "function") {
    return removeMemberRaw(adminGroupId, userId, deploymentId);
  }
  const where = { id: Number(adminGroupId) };
  if (deploymentId != null) where.deploymentId = Number(deploymentId);
  const g = await prisma.adminGroup.findFirst({ where });
  if (!g) return null;
  await prisma.adminGroupMember.deleteMany({
    where: { adminGroupId: Number(adminGroupId), userId: Number(userId) },
  });
  return findById(adminGroupId, deploymentId);
}

async function removeMemberRaw(adminGroupId, userId, deploymentId) {
  const g = await findById(adminGroupId, deploymentId);
  if (!g) return null;
  await prisma.$executeRawUnsafe(
    `DELETE FROM "AdminGroupMember" WHERE "adminGroupId" = $1 AND "userId" = $2`,
    Number(adminGroupId),
    Number(userId)
  );
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
