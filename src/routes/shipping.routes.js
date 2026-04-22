const express = require("express");
const shippingService = require("../services/shipping.service");
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
 * POST /api/shipping/rates
 * Body: { deploymentSlug?, address: { name, address1, address2?, city, state, zip }, items: [{ productId, quantity }] }
 * Returns: { rates: [{ serviceCode, serviceName, totalCharges, currencyCode, transitDays? }] }
 */
router.get("/status", resolveDeploymentId, async (req, res, next) => {
  try {
    const deploymentId = req.resolvedDeploymentId ?? req.query?.deploymentId ?? req.session?.selectedDeploymentId ?? 1;
    const dep = deploymentId ? await deploymentService.findById(deploymentId) : null;
    const shippingEnabled = dep ? dep.shippingEnabled !== false : true;
    return res.status(200).json({ shippingEnabled });
  } catch (err) {
    next(err);
  }
});

router.post("/rates", resolveDeploymentId, async (req, res, next) => {
  try {
    const { address, items } = req.body;
    const deploymentId = req.resolvedDeploymentId ?? req.body?.deploymentId ?? req.session?.selectedDeploymentId ?? 1;

    const dep = deploymentId ? await deploymentService.findById(deploymentId) : null;
    if (dep && dep.shippingEnabled === false) {
      return res.status(200).json({ rates: [], shippingDisabled: true });
    }

    if (!address || typeof address !== "object") {
      return res.status(400).json({
        message: "address (object with name, address1, city, zip, and country) is required; state is required for US",
      });
    }
    const { name, address1, address2, city, state, zip, country, countryCode: ccFromAddr } = address;
    const countryCode = shippingService.normalizeCountryCode(
      country != null && String(country).trim() !== "" ? country : ccFromAddr
    );
    const stateStr = state != null ? String(state).trim() : "";
    if (!address1 || !city || !zip) {
      return res.status(400).json({ message: "address must include address1, city, and zip (postal) code" });
    }
    if (countryCode === "US" && !stateStr) {
      return res.status(400).json({ message: "State is required for U.S. addresses" });
    }

    let itemCount = 0;
    if (items && Array.isArray(items)) {
      itemCount = items.reduce((s, it) => s + Math.max(1, Number(it.quantity) || 1), 0);
    }
    itemCount = Math.max(1, itemCount);

    const dest = {
      name: (name || "Recipient").trim(),
      address1: String(address1).trim(),
      address2: address2 ? String(address2).trim() : null,
      city: String(city).trim(),
      state: stateStr,
      zip: String(zip).trim(),
      countryCode,
    };

    const rates = await shippingService.getRates(dest, itemCount, deploymentId);
    return res.status(200).json({ rates });
  } catch (err) {
    if (err.message?.includes("EASYPOST_API_KEY")) {
      return res.status(503).json({ message: "Shipping rates are not configured" });
    }
    next(err);
  }
});

module.exports = router;
