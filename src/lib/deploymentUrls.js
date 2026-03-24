const wasabiService = require("../services/wasabi.service");

/**
 * Resolve deployment logoUrl to presigned URL when Wasabi is configured.
 * Only presigns keys stored from Wasabi uploads (uploads/...). Legacy local paths stay as-is.
 */
async function withPresignedLogo(deployment) {
  if (!deployment) return deployment;
  if (deployment.logoUrl && wasabiService.isConfigured() && deployment.logoUrl.startsWith("uploads/")) {
    const signed = await wasabiService.getImageUrl(deployment.logoUrl);
    if (signed) return { ...deployment, logoUrl: signed };
  }
  return deployment;
}

async function withPresignedLogos(deployments) {
  if (!Array.isArray(deployments)) return deployments;
  return Promise.all(deployments.map(withPresignedLogo));
}

module.exports = { withPresignedLogo, withPresignedLogos };
