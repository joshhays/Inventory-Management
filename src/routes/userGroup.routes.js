const express = require("express");
const userGroupController = require("../controllers/userGroup.controller");

const router = express.Router();

router.get("/", userGroupController.getUserGroups);
router.post("/", userGroupController.createUserGroup);

module.exports = router;
