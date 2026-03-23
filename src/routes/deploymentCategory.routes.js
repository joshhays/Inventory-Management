const express = require("express");
const deploymentCategoryService = require("../services/deploymentCategory.service");
const { requireAuth, requireAdmin } = require("../middleware/auth.middleware");

const router = express.Router({ mergeParams: true });

function getDeploymentId(req) {
  return req.params.id || req.session?.selectedDeploymentId;
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const deploymentId = getDeploymentId(req);
    if (!deploymentId) return res.status(400).json({ message: "Deployment required." });
    const categories = await deploymentCategoryService.findByDeployment(deploymentId);
    res.status(200).json(categories);
  } catch (e) {
    next(e);
  }
});

router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const deploymentId = getDeploymentId(req);
    if (!deploymentId) return res.status(400).json({ message: "Deployment required." });
    const { name, sortOrder } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ message: "Category name is required." });
    const category = await deploymentCategoryService.create(deploymentId, { name: name.trim(), sortOrder });
    res.status(201).json(category);
  } catch (e) {
    if (e.code === "P2002") return res.status(400).json({ message: "A category with this name already exists." });
    next(e);
  }
});

router.patch("/:categoryId", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const deploymentId = getDeploymentId(req);
    const categoryId = req.params.categoryId;
    if (!deploymentId || !categoryId) return res.status(400).json({ message: "Deployment and category required." });
    const { name, sortOrder } = req.body;
    const category = await deploymentCategoryService.update(categoryId, deploymentId, { name, sortOrder });
    res.status(200).json(category);
  } catch (e) {
    if (e.message === "Category not found") return res.status(404).json({ message: e.message });
    if (e.code === "P2002") return res.status(400).json({ message: "A category with this name already exists." });
    next(e);
  }
});

router.delete("/:categoryId", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const deploymentId = getDeploymentId(req);
    const categoryId = req.params.categoryId;
    if (!deploymentId || !categoryId) return res.status(400).json({ message: "Deployment and category required." });
    await deploymentCategoryService.remove(categoryId, deploymentId);
    res.status(204).send();
  } catch (e) {
    if (e.message === "Category not found") return res.status(404).json({ message: e.message });
    next(e);
  }
});

module.exports = router;
