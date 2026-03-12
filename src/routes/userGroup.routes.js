const express = require("express");
const userGroupController = require("../controllers/userGroup.controller");
const { requireAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", userGroupController.getUserGroups);
router.get("/:id", requireAdmin, userGroupController.getUserGroup);
router.post("/", requireAdmin, userGroupController.createUserGroup);
router.patch("/:id", requireAdmin, userGroupController.updateUserGroup);
router.put("/:id", requireAdmin, userGroupController.updateUserGroup);
router.delete("/:id", requireAdmin, userGroupController.deleteUserGroup);

module.exports = router;
