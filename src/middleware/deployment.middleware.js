const deploymentService = require("../services/deployment.service");

/**
 * Sets req.deploymentId from session or query param.
 * For store/unauthenticated: uses ?deployment=slug or first deployment (id 1) as default.
 */
async function setDeploymentContext(req, res, next) {
  try {
    const fromQuery = req.query.deployment;
    const fromHeader = req.get("X-Deployment-Slug");
    const slug = fromQuery || fromHeader;
    if (slug) {
      const dep = await deploymentService.findBySlug(slug);
      if (dep) req.deploymentId = dep.id;
    }
    if (req.deploymentId == null && req.session?.selectedDeploymentId) {
      req.deploymentId = req.session.selectedDeploymentId;
    }
    if (req.deploymentId == null) {
      const first = await deploymentService.findById(1);
      req.deploymentId = first?.id ?? 1;
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { setDeploymentContext };
