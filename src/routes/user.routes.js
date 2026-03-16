const express = require("express");
const userController = require("../controllers/user.controller");
const { requireAuth, requireAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get("/", userController.getUsers);
router.get("/:id", userController.getUser);
router.post("/", userController.createUser);
router.patch("/:id", userController.updateUser);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

module.exports = router;
