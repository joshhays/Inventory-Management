const userGroupService = require("../services/userGroup.service");

const getUserGroups = async (_req, res, next) => {
  try {
    const groups = await userGroupService.findAll();
    return res.status(200).json(groups);
  } catch (error) {
    return next(error);
  }
};

const createUserGroup = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "name is required." });
    }
    const group = await userGroupService.create({ name: name.trim() });
    return res.status(201).json(group);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "A group with this name already exists." });
    }
    return next(error);
  }
};

module.exports = {
  getUserGroups,
  createUserGroup,
};
