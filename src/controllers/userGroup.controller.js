const userGroupService = require("../services/userGroup.service");

const getUserGroups = async (_req, res, next) => {
  try {
    const groups = await userGroupService.findAll(req.deploymentId);
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
    const group = await userGroupService.create({
      deploymentId: req.deploymentId,
      name: name.trim(),
    });
    return res.status(201).json(group);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "A group with this name already exists." });
    }
    return next(error);
  }
};

const updateUserGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "name is required." });
    }
    const group = await userGroupService.update(id, { name: name.trim() }, req.deploymentId);
    if (!group) return res.status(404).json({ message: "Group not found." });
    return res.status(200).json(group);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "A group with this name already exists." });
    }
    return next(error);
  }
};

const deleteUserGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await userGroupService.remove(id, req.deploymentId);
    if (!result) return res.status(404).json({ message: "Group not found." });
    return res.status(200).json({ message: "Group deleted.", id: result.id });
  } catch (error) {
    return next(error);
  }
};

const getApproverGroup = async (req, res, next) => {
  try {
    if (!req.deploymentId) {
      return res.status(400).json({ message: "Deployment required. Select a deployment first." });
    }
    const group = await userGroupService.findOrCreateApproverGroup(req.deploymentId);
    return res.status(200).json(group);
  } catch (error) {
    next(error);
  }
};

const getUserGroup = async (req, res, next) => {
  try {
    const group = await userGroupService.findById(req.params.id, req.deploymentId);
    if (!group) return res.status(404).json({ message: "Group not found." });
    return res.status(200).json(group);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getUserGroups,
  getApproverGroup,
  getUserGroup,
  createUserGroup,
  updateUserGroup,
  deleteUserGroup,
};
