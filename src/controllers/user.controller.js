const userService = require("../services/user.service");

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
    const { email, password, name, isAdmin, isUser, groupIds, adminGroupIds } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
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

    const user = await userService.update(id, {
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
