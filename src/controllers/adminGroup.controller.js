const adminGroupService = require("../services/adminGroup.service");

const getAdminGroups = async (req, res, next) => {
  try {
    const groups = await adminGroupService.findAll(req.deploymentId);
    return res.status(200).json(groups);
  } catch (error) {
    return next(error);
  }
};

const createAdminGroup = async (req, res, next) => {
  try {
    const { name, permissions } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "name is required." });
    }
    const group = await adminGroupService.create({
      deploymentId: req.deploymentId,
      name: name.trim(),
      permissions: permissions || {},
    });
    return res.status(201).json(group);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "A group with this name already exists." });
    }
    return next(error);
  }
};

const updateAdminGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, permissions } = req.body;
    const group = await adminGroupService.update(id, { name, permissions }, req.deploymentId);
    if (!group) return res.status(404).json({ message: "Group not found." });
    return res.status(200).json(group);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "A group with this name already exists." });
    }
    return next(error);
  }
};

const deleteAdminGroup = async (req, res, next) => {
  try {
    const result = await adminGroupService.remove(req.params.id, req.deploymentId);
    if (!result) return res.status(404).json({ message: "Group not found." });
    return res.status(200).json({ message: "Group deleted.", id: result.id });
  } catch (error) {
    return next(error);
  }
};

const getAdminGroup = async (req, res, next) => {
  try {
    const group = await adminGroupService.findById(req.params.id, req.deploymentId);
    if (!group) return res.status(404).json({ message: "Group not found." });
    return res.status(200).json(group);
  } catch (error) {
    return next(error);
  }
};

const getGroupUsage = async (req, res, next) => {
  try {
    const usage = await adminGroupService.getUsage(req.params.id, req.deploymentId);
    if (!usage) return res.status(404).json({ message: "Group not found." });
    return res.status(200).json(usage);
  } catch (error) {
    return next(error);
  }
};

const duplicateAdminGroup = async (req, res, next) => {
  try {
    const group = await adminGroupService.duplicate(req.params.id, req.deploymentId);
    if (!group) return res.status(404).json({ message: "Group not found." });
    return res.status(201).json(group);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "A group with this name already exists." });
    }
    return next(error);
  }
};

const addMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required." });
    const group = await adminGroupService.addMember(id, userId, req.deploymentId);
    if (!group) return res.status(404).json({ message: "Group not found or user is not an admin." });
    return res.status(200).json(group);
  } catch (error) {
    return next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const group = await adminGroupService.removeMember(id, userId, req.deploymentId);
    if (!group) return res.status(404).json({ message: "Group not found." });
    return res.status(200).json(group);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAdminGroups,
  createAdminGroup,
  updateAdminGroup,
  deleteAdminGroup,
  getAdminGroup,
  getGroupUsage,
  duplicateAdminGroup,
  addMember,
  removeMember,
};
