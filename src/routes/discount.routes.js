const express = require("express");
const prisma = require("../lib/prisma");
const discountRuleService = require("../services/discountRule.service");
const deploymentService = require("../services/deployment.service");

const router = express.Router();

async function resolveDeploymentId(req, res, next) {
  const fromBody = req.body?.deploymentId ?? req.body?.deploymentSlug;
  const fromQuery = req.query?.deploymentId ?? req.query?.deployment;
  const val = fromBody ?? fromQuery;
  if (val == null) return next();
  if (Number(val)) {
    req.resolvedDeploymentId = Number(val);
    return next();
  }
  try {
    const dep = await deploymentService.findBySlug(String(val).trim());
    if (dep) req.resolvedDeploymentId = dep.id;
  } catch (_) {}
  next();
}

/**
 * POST /api/discount/calculate
 * Body: { deploymentSlug?, items: [{ productId, quantity, price? }] }
 * Returns: { discountAmount, ruleName?, subtotal }
 */
router.post("/calculate", resolveDeploymentId, async (req, res, next) => {
  try {
    const { items } = req.body;
    const deploymentId = req.resolvedDeploymentId ?? req.body?.deploymentId ?? req.session?.selectedDeploymentId ?? 1;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(200).json({ discountAmount: 0, subtotal: 0 });
    }

    const itemsWithPrice = [];
    let subtotal = 0;
    for (const it of items) {
      const productId = Number(it.productId);
      const quantity = Math.max(1, Math.floor(Number(it.quantity) || 1));
      let price = Number(it.price);
      if (!price || isNaN(price)) {
        const product = await prisma.product.findFirst({
          where: { id: productId, deploymentId },
          select: { price: true },
        });
        price = product?.price ?? 0;
      }
      itemsWithPrice.push({ productId, quantity, price });
      subtotal += price * quantity;
    }
    subtotal = Math.round(subtotal * 100) / 100;

    const result = await discountRuleService.findBestDiscount(deploymentId, itemsWithPrice, subtotal);
    const discountAmount = result?.discountAmount ?? 0;
    return res.status(200).json({
      discountAmount,
      ruleName: result?.ruleName ?? null,
      subtotal,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
