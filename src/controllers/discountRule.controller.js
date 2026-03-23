const discountRuleService = require("../services/discountRule.service");

function getDeploymentId(req) {
  return req.params.id || req.session?.selectedDeploymentId;
}

async function getRules(req, res, next) {
  try {
    const deploymentId = getDeploymentId(req);
    if (!deploymentId) return res.status(400).json({ message: "Deployment required." });
    const rules = await discountRuleService.findMany(deploymentId);
    return res.status(200).json(rules);
  } catch (err) {
    next(err);
  }
}

async function createRule(req, res, next) {
  try {
    const deploymentId = getDeploymentId(req);
    if (!deploymentId) return res.status(400).json({ message: "Deployment required." });
    const rule = await discountRuleService.create(deploymentId, req.body);
    return res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
}

async function updateRule(req, res, next) {
  try {
    const deploymentId = getDeploymentId(req);
    const { id } = req.params;
    if (!deploymentId) return res.status(400).json({ message: "Deployment required." });
    const rule = await discountRuleService.update(id, deploymentId, req.body);
    return res.status(200).json(rule);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Rule not found" });
    next(err);
  }
}

async function deleteRule(req, res, next) {
  try {
    const deploymentId = getDeploymentId(req);
    const { id } = req.params;
    if (!deploymentId) return res.status(400).json({ message: "Deployment required." });
    await discountRuleService.remove(id, deploymentId);
    return res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ message: "Rule not found" });
    next(err);
  }
}

module.exports = {
  getRules,
  createRule,
  updateRule,
  deleteRule,
};
