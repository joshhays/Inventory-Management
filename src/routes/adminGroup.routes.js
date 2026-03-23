const express = require("express");
const adminGroupController = require("../controllers/adminGroup.controller");
const { requireAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", adminGroupController.getAdminGroups);
router.get("/:id/usage", adminGroupController.getGroupUsage);
router.post("/:id/duplicate", requireAdmin, adminGroupController.duplicateAdminGroup);
router.get("/:id", adminGroupController.getAdminGroup);
router.post("/", requireAdmin, adminGroupController.createAdminGroup);
router.patch("/:id", requireAdmin, adminGroupController.updateAdminGroup);
router.put("/:id", requireAdmin, adminGroupController.updateAdminGroup);
router.delete("/:id", requireAdmin, adminGroupController.deleteAdminGroup);
router.post("/:id/members", requireAdmin, adminGroupController.addMember);
router.delete("/:id/members/:userId", requireAdmin, adminGroupController.removeMember);

module.exports = router;
