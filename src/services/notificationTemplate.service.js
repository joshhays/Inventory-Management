/**
 * Notification template CRUD service.
 */

const prisma = require("../lib/prisma");

async function findMany() {
  try {
    return await prisma.notificationTemplate.findMany({
      orderBy: { name: "asc" },
      include: { recipientGroups: { include: { adminGroup: true } } },
    });
  } catch (err) {
    const msg = String(err.message || "");
    if (
      err.code === "P2010" ||
      msg.includes("adminGroup") ||
      msg.includes("does not exist") ||
      msg.includes("column") ||
      msg.includes("relation")
    ) {
      return prisma.notificationTemplate.findMany({ orderBy: { name: "asc" } });
    }
    throw err;
  }
}

async function findById(id) {
  try {
    return await prisma.notificationTemplate.findUnique({
      where: { id: Number(id) },
      include: { recipientGroups: { include: { adminGroup: true } } },
    });
  } catch (err) {
    const msg = String(err.message || "");
    if (
      err.code === "P2010" ||
      msg.includes("adminGroup") ||
      msg.includes("does not exist") ||
      msg.includes("column") ||
      msg.includes("relation")
    ) {
      return prisma.notificationTemplate.findUnique({ where: { id: Number(id) } });
    }
    throw err;
  }
}

function findByName(name) {
  return prisma.notificationTemplate.findUnique({
    where: { name: String(name).trim() },
  });
}

async function create({ name, subject, body, recipientType, groupIds, customEmails }) {
  const rt = recipientType === "admin_groups" ? "admin_groups" : recipientType === "custom_emails" ? "custom_emails" : "customer";
  const data = {
    name: String(name).trim(),
    subject: String(subject),
    body: String(body),
    recipientType: rt,
    customEmails: rt === "custom_emails" && customEmails ? String(customEmails).trim() : null,
  };
  return prisma.notificationTemplate.create({
    data: {
      ...data,
      ...(rt === "admin_groups" && Array.isArray(groupIds) && groupIds.length
        ? {
            recipientGroups: {
              create: groupIds.map((gid) => ({ adminGroupId: Number(gid) })),
            },
          }
        : {}),
    },
    include: { recipientGroups: { include: { adminGroup: true } } },
  });
}

async function update(id, { name, subject, body, recipientType, groupIds, customEmails }) {
  const data = {};
  if (name !== undefined) data.name = String(name).trim();
  if (subject !== undefined) data.subject = String(subject);
  if (body !== undefined) data.body = String(body);
  if (recipientType !== undefined) {
    data.recipientType = recipientType === "admin_groups" ? "admin_groups" : recipientType === "custom_emails" ? "custom_emails" : "customer";
  }
  if (customEmails !== undefined) {
    data.customEmails = customEmails ? String(customEmails).trim() : null;
  }

  const template = await prisma.notificationTemplate.findUnique({ where: { id: Number(id) } });
  if (!template) return null;

  const effectiveRecipientType = data.recipientType ?? template.recipientType;
  if (groupIds !== undefined || effectiveRecipientType !== "admin_groups") {
    await prisma.notificationTemplateRecipient.deleteMany({ where: { templateId: Number(id) } });
    if (effectiveRecipientType === "admin_groups" && Array.isArray(groupIds) && groupIds.length) {
      await prisma.notificationTemplateRecipient.createMany({
        data: groupIds.map((gid) => ({ templateId: Number(id), adminGroupId: Number(gid) })),
      });
    }
  }

  return prisma.notificationTemplate.update({
    where: { id: Number(id) },
    data,
    include: { recipientGroups: { include: { adminGroup: true } } },
  });
}

async function remove(id) {
  return prisma.notificationTemplate.delete({
    where: { id: Number(id) },
  });
}

module.exports = {
  findMany,
  findById,
  findByName,
  create,
  update,
  remove,
};
