/**
 * Require authenticated user. Attaches req.user (safe user object).
 * Returns 401 if not logged in.
 */
function requireAuth(req, res, next) {
  const user = req.session?.user;
  if (!user) {
    return res.status(401).json({ message: "Authentication required." });
  }
  req.user = user;
  next();
}

/**
 * Require admin role. Must be used after requireAuth.
 * Returns 403 if user is not admin.
 */
function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Admin access required." });
  }
  next();
}

/**
 * Optional auth: attach user if logged in, but don't require it.
 */
function optionalAuth(req, res, next) {
  const user = req.session?.user;
  if (user) {
    req.user = user;
  }
  next();
}

/**
 * Require a deployment to be selected. Must be used after requireAuth.
 * Sets req.deploymentId from session or X-Deployment-Slug header. Returns 400 if none.
 */
async function requireDeployment(req, res, next) {
  let id = req.session?.selectedDeploymentId;
  if (!id) {
    const slug = req.get("X-Deployment-Slug");
    if (slug) {
      try {
        const deploymentService = require("../services/deployment.service");
        const dep = await deploymentService.findBySlug(slug);
        if (dep) id = dep.id;
      } catch (_) {}
    }
  }
  if (!id) {
    return res.status(400).json({ message: "No deployment selected. Select a deployment first." });
  }
  req.deploymentId = id;
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth,
  requireDeployment,
};
