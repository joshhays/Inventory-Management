/** Updates the nav logo to the selected deployment's logo, if any. */
(function () {
  const logo = document.querySelector(".nav-logo-wrap .nav-logo, .nav-logo-wrap img");
  if (!logo) return;
  fetch("/api/deployments/selected", { credentials: "include" })
    .then((r) => r.json())
    .then((data) => {
      if (data.deployment?.logoUrl) {
        logo.src = data.deployment.logoUrl;
        logo.alt = data.deployment.name || "Logo";
      }
    })
    .catch(() => {});
})();
