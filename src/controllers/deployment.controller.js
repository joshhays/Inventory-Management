const path = require("path");
const fs = require("fs");
const deploymentService = require("../services/deployment.service");
const { withPresignedLogo, withPresignedLogos } = require("../lib/deploymentUrls");

const list = async (req, res, next) => {
  try {
    const deployments = await deploymentService.findAll();
    res.status(200).json(await withPresignedLogos(deployments));
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
    res.status(200).json(await withPresignedLogo(deployment));
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
    res.status(200).json({ deployment: await withPresignedLogo(deployment) });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, slug, logoUrl, brandColor1, brandColor2, customerInfo, cartDisclaimer, shippingEnabled } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ message: "name and slug are required." });
    }
    const deployment = await deploymentService.create({ name, slug, logoUrl, brandColor1, brandColor2, customerInfo, cartDisclaimer, shippingEnabled });
    res.status(201).json(await withPresignedLogo(deployment));
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "A deployment with this slug already exists." });
    }
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, logoUrl, brandColor1, brandColor2, customerInfo, cartDisclaimer, shippingEnabled } = req.body;
    const deployment = await deploymentService.update(id, { name, slug, logoUrl, brandColor1, brandColor2, customerInfo, cartDisclaimer, shippingEnabled });
    if (!deployment) {
      return res.status(404).json({ message: "Deployment not found." });
    }
    res.status(200).json(await withPresignedLogo(deployment));
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "A deployment with this slug already exists." });
    }
    next(error);
  }
};

const uploadLogo = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: "No logo file uploaded." });
    }
    const deployment = await deploymentService.findById(id);
    if (!deployment) {
      return res.status(404).json({ message: "Deployment not found." });
    }
    if (deployment.logoUrl && deployment.logoUrl.startsWith("/uploads/")) {
      const oldPath = path.join(__dirname, "../..", deployment.logoUrl);
      try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (_) {}
    }

    const wasabiService = require("../services/wasabi.service");
    if (!wasabiService.isConfigured()) {
      return res.status(503).json({ message: "Wasabi is not configured. Set WASABI_ACCESS_KEY, WASABI_SECRET_KEY, WASABI_BUCKET." });
    }

    const contentType = req.file.mimetype || "image/png";
    const ext = (path.extname(req.file.originalname) || ".png").toLowerCase();
    const safeExt = [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext) ? ext : ".png";
    const fileName = `deployment-${id}-${Date.now()}${safeExt}`;

    const fileKey = await wasabiService.uploadFile(req.file.buffer, fileName, contentType, "deployment-logos");
    if (!fileKey) return res.status(500).json({ message: "Wasabi upload failed." });

    const updated = await deploymentService.update(id, { logoUrl: fileKey });
    res.status(200).json(await withPresignedLogo(updated));
  } catch (error) {
    next(error);
  }
};

const removeLogo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deployment = await deploymentService.findById(id);
    if (!deployment) {
      return res.status(404).json({ message: "Deployment not found." });
    }
    if (deployment.logoUrl && deployment.logoUrl.startsWith("/uploads/")) {
      const oldPath = path.join(__dirname, "../..", deployment.logoUrl);
      try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (_) {}
    }
    const updated = await deploymentService.update(id, { logoUrl: null });
    res.status(200).json(await withPresignedLogo(updated));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  list,
  select,
  getSelected,
  create,
  update,
  uploadLogo,
  removeLogo,
};
