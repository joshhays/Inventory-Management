const express = require("express");
const authController = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.me);

router.get("/debug", (req, res) => {
  res.json({
    hasSession: !!req.session,
    hasUser: !!req.session?.user,
    cookie: req.headers.cookie ? "present" : "missing",
    env: process.env.NODE_ENV || "development",
  });
});

module.exports = router;
