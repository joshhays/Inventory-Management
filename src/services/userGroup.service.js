const prisma = require("../lib/prisma");

function findAll() {
  return prisma.userGroup.findMany({
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
  });
}

module.exports = {
  findAll,
  create,
  findById,
};
