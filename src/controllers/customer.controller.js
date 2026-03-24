const prisma = require("../lib/prisma");

async function getProfile(req, res, next) {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, name: true, phone: true },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.status(200).json({ profile: user });
  } catch (error) {
    next(error);
  }
}

function isValidName(name, email) {
  if (name === null || name === undefined) return true;
  const n = String(name).trim();
  const e = String(email).toLowerCase().trim();
  if (n === "") return false;
  if (n.toLowerCase() === e) return false;
  if (n.toLowerCase() === e.split("@")[0]) return false;
  return true;
}

async function updateProfile(req, res, next) {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }
    const { username, name, phone } = req.body;
    if (name !== undefined) {
      const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (!isValidName(name, existing?.email || "")) {
        return res.status(400).json({
          message: "Name must be different from your email address.",
        });
      }
    }
    const updateData = {};
    if (name !== undefined) updateData.name = name ? String(name).trim() : null;
    if (phone !== undefined) updateData.phone = phone ? String(phone).trim() : null;
    if (username !== undefined) {
      const u = String(username).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (u.length < 2) {
        return res.status(400).json({ message: "Username must be at least 2 characters (letters, numbers, underscores, hyphens only)." });
      }
      const existing = await prisma.user.findFirst({
        where: { username: u, NOT: { id: userId } },
      });
      if (existing) {
        return res.status(400).json({ message: "This username is already taken." });
      }
      updateData.username = u;
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, username: true, email: true, name: true, phone: true },
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
