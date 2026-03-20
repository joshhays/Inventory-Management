const express = require("express");
const notificationTemplateService = require("../services/notificationTemplate.service");

const router = express.Router();

/** Available triggers - when each email fires. Section = Pageflex-style grouping. */
const AVAILABLE_TRIGGERS = [
  { value: "ORDER_PLACED", label: "Order placed", section: "user" },
  { value: "ORDER_APPROVED", label: "Order approved", section: "user" },
  { value: "ORDER_REJECTED", label: "Order rejected", section: "user" },
  { value: "ORDER_APPROVAL_NEEDED", label: "Approval required", section: "reviewer" },
  { value: "ORDER_READY_FOR_PRINT", label: "Order ready for printing", section: "admin" },
];

/**
 * GET /api/notification-templates/triggers
 * List available trigger options for templates (with section for Pageflex-style UI).
 */
router.get("/triggers", (_req, res) => {
  return res.status(200).json(AVAILABLE_TRIGGERS);
});

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
    const { name, subject, body, recipientType, groupIds, customEmails, displayName, enabled } = req.body;
    if (!name || !subject || body === undefined) {
      return res.status(400).json({ message: "Trigger, subject, and body are required" });
    }
    const template = await notificationTemplateService.create({ name, subject, body, recipientType, groupIds, customEmails, displayName, enabled });
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
    const { name, subject, body, recipientType, groupIds, customEmails, displayName, enabled } = req.body;
    const template = await notificationTemplateService.update(req.params.id, { name, subject, body, recipientType, groupIds, customEmails, displayName, enabled });
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
