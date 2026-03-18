const express = require("express");
const shippingTierController = require("../controllers/shippingTier.controller");
const { requireAuth, requireAdmin } = require("../middleware/auth.middleware");

const router = express.Router({ mergeParams: true });

router.get("/", requireAuth, shippingTierController.getTiers);
router.post("/", requireAuth, requireAdmin, shippingTierController.createTier);
router.patch("/:id", requireAuth, requireAdmin, shippingTierController.updateTier);
router.delete("/:id", requireAuth, requireAdmin, shippingTierController.deleteTier);

module.exports = router;
