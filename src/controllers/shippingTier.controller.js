const shippingTierService = require("../services/shippingTier.service");

function getDeploymentId(req) {
  return req.params.id || req.session?.selectedDeploymentId;
}

async function getTiers(req, res, next) {
  try {
    const deploymentId = getDeploymentId(req);
    if (!deploymentId) return res.status(400).json({ message: "Deployment required." });
    const tiers = await shippingTierService.findMany(deploymentId);
    return res.status(200).json(tiers);
  } catch (err) {
    next(err);
  }
}

async function createTier(req, res, next) {
  try {
    const deploymentId = getDeploymentId(req);
    if (!deploymentId) return res.status(400).json({ message: "Deployment required." });
    const tier = await shippingTierService.create(deploymentId, req.body);
    return res.status(201).json(tier);
  } catch (err) {
    next(err);
  }
}

async function updateTier(req, res, next) {
  try {
    const deploymentId = getDeploymentId(req);
    const { id } = req.params;
    if (!deploymentId) return res.status(400).json({ message: "Deployment required." });
    const tier = await shippingTierService.update(id, deploymentId, req.body);
    return res.status(200).json(tier);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Tier not found" });
    next(err);
  }
}

async function deleteTier(req, res, next) {
  try {
    const deploymentId = getDeploymentId(req);
    const { id } = req.params;
    if (!deploymentId) return res.status(400).json({ message: "Deployment required." });
    await shippingTierService.remove(id, deploymentId);
    return res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Tier not found" });
    next(err);
  }
}

module.exports = {
  getTiers,
  createTier,
  updateTier,
  deleteTier,
};
