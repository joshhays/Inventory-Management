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

function create({ deploymentId, name, permissions = {}, canApproveOrders, canManageInventory, canEditUsers }) {
  if (!deploymentId) throw new Error("Deployment is required.");
  if (!hasAdminGroup()) {
    return createRaw({ deploymentId, name, permissions, canApproveOrders, canManageInventory, canEditUsers });
  }
  const data = {
    deploymentId: Number(deploymentId),
    name: String(name).trim(),
    permissions: JSON.stringify(permissions || {}),
    canApproveOrders: canApproveOrders === true,
    canManageInventory: canManageInventory === true,
    canEditUsers: canEditUsers === true,
  };
  return prisma.adminGroup.create({
    data,
    include: { members: { include: { user: true } } },
  });
}

async function createRaw({ deploymentId, name, permissions = {}, canApproveOrders, canManageInventory, canEditUsers }) {
  const perms = JSON.stringify(permissions);
  const approve = canApproveOrders === true;
  const inventory = canManageInventory === true;
  const users = canEditUsers === true;
  const [row] = await prisma.$queryRaw(Prisma.sql`
    INSERT INTO "AdminGroup" (name, "deploymentId", permissions, "canApproveOrders", "canManageInventory", "canEditUsers")
    VALUES (${String(name).trim()}, ${Number(deploymentId)}, ${perms}, ${approve}, ${inventory}, ${users})
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

async function update(id, { name, permissions, canApproveOrders, canManageInventory, canEditUsers }, deploymentId) {
  if (!hasAdminGroup()) {
    return updateRaw(id, { name, permissions, canApproveOrders, canManageInventory, canEditUsers }, deploymentId);
  }
  const where = { id: Number(id) };
  if (deploymentId != null) where.deploymentId = Number(deploymentId);
  const g = await prisma.adminGroup.findFirst({ where });
  if (!g) return null;
  const data = {};
  if (name !== undefined) data.name = String(name).trim();
  if (permissions !== undefined) data.permissions = JSON.stringify(permissions);
  if (canApproveOrders !== undefined) data.canApproveOrders = Boolean(canApproveOrders);
  if (canManageInventory !== undefined) data.canManageInventory = Boolean(canManageInventory);
  if (canEditUsers !== undefined) data.canEditUsers = Boolean(canEditUsers);
  return prisma.adminGroup.update({
    where: { id: Number(id) },
    data,
    include: { members: { include: { user: true } } },
  });
}

async function updateRaw(id, { name, permissions, canApproveOrders, canManageInventory, canEditUsers }, deploymentId) {
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
  if (canApproveOrders !== undefined) {
    updates.push(`"canApproveOrders" = $${i++}`);
    values.push(Boolean(canApproveOrders));
  }
  if (canManageInventory !== undefined) {
    updates.push(`"canManageInventory" = $${i++}`);
    values.push(Boolean(canManageInventory));
  }
  if (canEditUsers !== undefined) {
    updates.push(`"canEditUsers" = $${i++}`);
    values.push(Boolean(canEditUsers));
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

/**
 * Get usage report for an admin group (where it's referenced).
 * @returns {Promise<{ templates: string[], inUse: boolean }>}
 */
async function getUsage(id, deploymentId) {
  const g = await findById(id, deploymentId);
  if (!g) return null;
  const templates = [];
  try {
    const rows = await prisma.$queryRaw`
      SELECT nt.name, nt."displayName" FROM "NotificationTemplateRecipient" ntr
      JOIN "NotificationTemplate" nt ON nt.id = ntr."templateId"
      WHERE ntr."adminGroupId" = ${Number(id)}
    `;
    for (const r of rows || []) {
      templates.push(r.displayName || r.name || "Template");
    }
  } catch (_) {
    // Fallback if raw fails
  }
  return { templates, inUse: templates.length > 0 };
}

/**
 * Duplicate an admin group (name, permissions). Does not copy members.
 */
async function duplicate(id, deploymentId) {
  const g = await findById(id, deploymentId);
  if (!g) return null;
  const baseName = (g.name || "").trim();
  let newName = baseName + " (Copy)";
  const existing = await findAll(deploymentId);
  const names = new Set(existing.map((x) => x.name));
  let suffix = 1;
  while (names.has(newName)) {
    newName = `${baseName} (Copy ${++suffix})`;
  }
  return create({
    deploymentId: g.deploymentId,
    name: newName,
    permissions: typeof g.permissions === "string" ? JSON.parse(g.permissions || "{}") : (g.permissions || {}),
  });
}

module.exports = {
  findAll,
  create,
  findById,
  update,
  remove,
  addMember,
  removeMember,
  getUsage,
  duplicate,
};
