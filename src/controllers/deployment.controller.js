const deploymentService = require("../services/deployment.service");

const list = async (req, res, next) => {
  try {
    const deployments = await deploymentService.findAll();
    res.status(200).json(deployments);
  } catch (error) {
    next(error);
  }
};

const select = async (req, res, next) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ message: "Deployment id is required." });
    }
    const deployment = await deploymentService.findById(id);
    if (!deployment) {
      return res.status(404).json({ message: "Deployment not found." });
    }
    req.session.selectedDeploymentId = deployment.id;
    res.status(200).json(deployment);
  } catch (error) {
    next(error);
  }
};

const getSelected = async (req, res, next) => {
  try {
    const id = req.session?.selectedDeploymentId;
    if (!id) {
      return res.status(200).json({ deployment: null });
    }
    const deployment = await deploymentService.findById(id);
    if (!deployment) {
      req.session.selectedDeploymentId = undefined;
      return res.status(200).json({ deployment: null });
    }
    res.status(200).json({ deployment });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, slug, logoUrl } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ message: "name and slug are required." });
    }
    const deployment = await deploymentService.create({ name, slug, logoUrl });
    res.status(201).json(deployment);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "A deployment with this slug already exists." });
    }
    next(error);
  }
};

module.exports = {
  list,
  select,
  getSelected,
  create,
};
