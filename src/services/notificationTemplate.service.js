/**
 * Notification template CRUD service.
 */

const prisma = require("../lib/prisma");

function findMany() {
  return prisma.notificationTemplate.findMany({
    orderBy: { name: "asc" },
  });
}

function findById(id) {
  return prisma.notificationTemplate.findUnique({
    where: { id: Number(id) },
  });
}

function findByName(name) {
  return prisma.notificationTemplate.findUnique({
    where: { name: String(name).trim() },
  });
}

async function create({ name, subject, body }) {
  return prisma.notificationTemplate.create({
    data: {
      name: String(name).trim(),
      subject: String(subject),
      body: String(body),
    },
  });
}

async function update(id, { name, subject, body }) {
  const data = {};
  if (name !== undefined) data.name = String(name).trim();
  if (subject !== undefined) data.subject = String(subject);
  if (body !== undefined) data.body = String(body);

  return prisma.notificationTemplate.update({
    where: { id: Number(id) },
    data,
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
