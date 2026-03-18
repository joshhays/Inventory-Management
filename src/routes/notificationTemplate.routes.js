const express = require("express");
const notificationTemplateService = require("../services/notificationTemplate.service");

const router = express.Router();

/**
 * GET /api/notification-templates
 * List all notification templates.
 */
router.get("/", async (req, res, next) => {
  try {
    const templates = await notificationTemplateService.findMany();
    return res.status(200).json(templates);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/notification-templates/:id
 * Get a single template by ID.
 */
router.get("/:id", async (req, res, next) => {
  try {
    const template = await notificationTemplateService.findById(req.params.id);
    if (!template) return res.status(404).json({ message: "Template not found" });
    return res.status(200).json(template);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notification-templates
 * Create a new template.
 */
router.post("/", async (req, res, next) => {
  try {
    const { name, subject, body } = req.body;
    if (!name || !subject || body === undefined) {
      return res.status(400).json({ message: "name, subject, and body are required" });
    }
    const template = await notificationTemplateService.create({ name, subject, body });
    return res.status(201).json(template);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "A template with this name already exists" });
    }
    next(err);
  }
});

/**
 * PATCH /api/notification-templates/:id
 * Update a template.
 */
router.patch("/:id", async (req, res, next) => {
  try {
    const { name, subject, body } = req.body;
    const template = await notificationTemplateService.update(req.params.id, { name, subject, body });
    return res.status(200).json(template);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Template not found" });
    }
    if (err.code === "P2002") {
      return res.status(409).json({ message: "A template with this name already exists" });
    }
    next(err);
  }
});

/**
 * DELETE /api/notification-templates/:id
 * Delete a template.
 */
router.delete("/:id", async (req, res, next) => {
  try {
    await notificationTemplateService.remove(req.params.id);
    return res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Template not found" });
    }
    next(err);
  }
});

module.exports = router;
