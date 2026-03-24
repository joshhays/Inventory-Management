const userService = require("../services/user.service");

function isValidName(name, email) {
  if (name === null || name === undefined) return true;
  const n = String(name).trim();
  const e = String(email).toLowerCase().trim();
  if (n === "") return false;
  if (n.toLowerCase() === e) return false;
  if (n.toLowerCase() === e.split("@")[0]) return false;
  return true;
}

const getUsers = async (req, res, next) => {
  try {
    const users = await userService.findAll();
    return res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    const user = await userService.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { username, email, password, name, isAdmin, isUser, groupIds, adminGroupIds } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email, and password are required." });
    }
    if (!isValidName(name, email)) {
      return res.status(400).json({
        message: "Name is required and must be different from the email address.",
      });
    }
    const isAdminUser = isAdmin ?? false;
    const adminGroupIdList = Array.isArray(adminGroupIds)
      ? adminGroupIds.filter((id) => Number(id) > 0).map(Number)
      : [];
    if (isAdminUser && adminGroupIdList.length === 0) {
      return res.status(400).json({
        message: "Admin users must be assigned at least one admin group. Select an admin group to determine their access from the Admin Access tab.",
      });
    }
    const user = await userService.create({
      username,
      email,
      password,
      name,
      isAdmin: isAdminUser,
      isUser: isUser !== false,
      groupIds: groupIds || [],
      adminGroupIds: adminGroupIdList,
    });
    return res.status(201).json(user);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "A user with this email already exists." });
    }
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, password, name, isAdmin, isUser, groupIds, adminGroupIds } = req.body;

    if (Number(id) === req.user.id) {
      if (isAdmin === false && req.user.isAdmin) {
        return res.status(400).json({
          message: "You cannot remove your own admin access.",
        });
      }
    }

    const adminGroupIdList =
      adminGroupIds !== undefined
        ? (Array.isArray(adminGroupIds) ? adminGroupIds : []).filter((id) => Number(id) > 0).map(Number)
        : undefined;
    if (adminGroupIds !== undefined && isAdmin && adminGroupIdList.length === 0) {
      return res.status(400).json({
        message: "Admin users must be assigned at least one admin group.",
      });
    }

    if (name !== undefined) {
      const existing = await userService.findById(id);
      const emailToCheck = (email !== undefined ? String(email).toLowerCase().trim() : null) || existing?.email || "";
      if (!isValidName(name, emailToCheck)) {
        return res.status(400).json({
          message: "Name must be different from the email address.",
        });
      }
    }

    const user = await userService.update(id, {
      username: req.body.username,
      email,
      password,
      name,
      isAdmin,
      isUser,
      groupIds,
      adminGroupIds: adminGroupIdList,
    });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.status(200).json(user);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "A user with this email already exists." });
    }
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (Number(id) === req.user.id) {
      return res.status(400).json({ message: "You cannot delete your own account." });
    }
    const result = await userService.remove(id);
    if (!result) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.status(200).json({ message: "User deleted.", id: result.id });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
};
