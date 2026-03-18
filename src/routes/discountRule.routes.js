const express = require("express");
const discountRuleController = require("../controllers/discountRule.controller");
const { requireAuth, requireAdmin } = require("../middleware/auth.middleware");

const router = express.Router({ mergeParams: true });

router.get("/", requireAuth, discountRuleController.getRules);
router.post("/", requireAuth, requireAdmin, discountRuleController.createRule);
router.patch("/:id", requireAuth, requireAdmin, discountRuleController.updateRule);
router.delete("/:id", requireAuth, requireAdmin, discountRuleController.deleteRule);

module.exports = router;
