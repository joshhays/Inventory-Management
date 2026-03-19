/**
 * Notification template CRUD service.
 */

const prisma = require("../lib/prisma");

function findMany() {
  return prisma.notificationTemplate.findMany({
    orderBy: { name: "asc" },
    include: { recipientGroups: { include: { group: true } } },
  });
}

function findById(id) {
  return prisma.notificationTemplate.findUnique({
    where: { id: Number(id) },
    include: { recipientGroups: { include: { group: true } } },
  });
}

function findByName(name) {
  return prisma.notificationTemplate.findUnique({
    where: { name: String(name).trim() },
  });
}

async function create({ name, subject, body, recipientType, groupIds }) {
  const data = {
    name: String(name).trim(),
    subject: String(subject),
    body: String(body),
    recipientType: recipientType === "admin_groups" ? "admin_groups" : "customer",
  };
  return prisma.notificationTemplate.create({
    data: {
      ...data,
      ...(data.recipientType === "admin_groups" && Array.isArray(groupIds) && groupIds.length
        ? {
            recipientGroups: {
              create: groupIds.map((gid) => ({ groupId: Number(gid) })),
            },
          }
        : {}),
    },
    include: { recipientGroups: { include: { group: true } } },
  });
}

async function update(id, { name, subject, body, recipientType, groupIds }) {
  const data = {};
  if (name !== undefined) data.name = String(name).trim();
  if (subject !== undefined) data.subject = String(subject);
  if (body !== undefined) data.body = String(body);
  if (recipientType !== undefined) data.recipientType = recipientType === "admin_groups" ? "admin_groups" : "customer";

  const template = await prisma.notificationTemplate.findUnique({ where: { id: Number(id) } });
  if (!template) return null;

  const effectiveRecipientType = data.recipientType ?? template.recipientType;
  if (groupIds !== undefined || effectiveRecipientType === "customer") {
    await prisma.notificationTemplateRecipient.deleteMany({ where: { templateId: Number(id) } });
    if (effectiveRecipientType === "admin_groups" && Array.isArray(groupIds) && groupIds.length) {
      await prisma.notificationTemplateRecipient.createMany({
        data: groupIds.map((gid) => ({ templateId: Number(id), groupId: Number(gid) })),
      });
    }
  }

  return prisma.notificationTemplate.update({
    where: { id: Number(id) },
    data,
    include: { recipientGroups: { include: { group: true } } },
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
