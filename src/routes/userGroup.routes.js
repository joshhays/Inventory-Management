const express = require("express");
const userGroupController = require("../controllers/userGroup.controller");
const { requireAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", userGroupController.getUserGroups);
router.post("/", requireAdmin, userGroupController.createUserGroup);

module.exports = router;
