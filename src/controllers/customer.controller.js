const prisma = require("../lib/prisma");

async function getProfile(req, res, next) {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, phone: true },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.status(200).json({ profile: user });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }
    const { name, phone } = req.body;
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name: name ? String(name).trim() : null }),
        ...(phone !== undefined && { phone: phone ? String(phone).trim() : null }),
      },
      select: { id: true, email: true, name: true, phone: true },
    });
    return res.status(200).json({ profile: user });
  } catch (error) {
    next(error);
  }
}

async function getAddresses(req, res, next) {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }
    const addresses = await prisma.savedAddress.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return res.status(200).json({ addresses });
  } catch (error) {
    next(error);
  }
}

async function createAddress(req, res, next) {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }
    const { label, name, company, address1, address2, city, state, zip } = req.body;
    if (!label || !name || !address1 || !city || !state || !zip) {
      return res.status(400).json({
        message: "label, name, address1, city, state, and zip are required.",
      });
    }
    const address = await prisma.savedAddress.create({
      data: {
        userId,
        label: String(label).trim(),
        name: String(name).trim(),
        company: company ? String(company).trim() : null,
        address1: String(address1).trim(),
        address2: address2 ? String(address2).trim() : null,
        city: String(city).trim(),
        state: String(state).trim(),
        zip: String(zip).trim(),
      },
    });
    return res.status(201).json(address);
  } catch (error) {
    next(error);
  }
}

async function deleteAddress(req, res, next) {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }
    const id = Number(req.params.id);
    const address = await prisma.savedAddress.findFirst({
      where: { id, userId },
    });
    if (!address) {
      return res.status(404).json({ message: "Address not found." });
    }
    await prisma.savedAddress.delete({ where: { id } });
    return res.status(200).json({ message: "Deleted." });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getAddresses,
  createAddress,
  deleteAddress,
};
