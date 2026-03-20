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
 * User is admin if isAdmin=true OR has any AdminGroup (Pageflex-style).
 * Attaches req.user.permissions from AdminGroup flags for use in routes.
 */
function requireAdmin(req, res, next) {
  const user = req.user;
  const hasAdminGroup = user?.adminGroupIds?.length > 0;
  const isAdmin = user?.isAdmin || hasAdminGroup;
  if (!isAdmin) {
    return res.status(403).json({ message: "Admin access required." });
  }
  req.user.permissions = req.user.permissions || {
    canApproveOrders: user?.isAdmin || false,
    canManageInventory: user?.isAdmin || false,
    canEditUsers: user?.isAdmin || false,
  };
  if (hasAdminGroup && user?.permissions) {
    req.user.permissions = user.permissions;
  } else if (user?.isAdmin) {
    req.user.permissions = { canApproveOrders: true, canManageInventory: true, canEditUsers: true };
  }
  next();
}

/**
 * Require a specific permission. Must be used after requireAuth, requireAdmin.
 * E.g. requirePermission('canApproveOrders')
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (req.user?.permissions?.[permission]) {
      return next();
    }
    return res.status(403).json({ message: `Permission denied: ${permission} required.` });
  };
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
  requirePermission,
  optionalAuth,
  requireDeployment,
};
