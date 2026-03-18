/** Updates the nav logo and brand colors from the selected deployment. Adds Storefront link when deployment is selected. */
(function () {
  fetch("/api/deployments/selected", { credentials: "include" })
    .then((r) => r.json())
    .then((data) => {
      const d = data.deployment;
      if (d) {
        const logo = document.querySelector(".nav-logo-wrap .nav-logo, .nav-logo-wrap img");
        if (d.logoUrl && logo) {
          logo.src = d.logoUrl;
          logo.alt = d.name || "Logo";
        }
        const c1 = d.brandColor1 || null;
        const c2 = d.brandColor2 || null;
        const root = document.documentElement;
        if (c1) {
          root.style.setProperty("--sidebar-bg", c1);
          root.style.setProperty("--nav-brand-bg", c1);
        }
        if (c2) {
          const c2Light = lighten(c2, 0.15);
          root.style.setProperty("--page-bg", `linear-gradient(135deg, ${c2Light} 0%, ${c2} 50%, ${adjustColor(c2, 0.92)} 100%)`);
        }
        if (d.slug) {
          const existing = document.getElementById("viewStorefrontLink");
          const switchLink = document.querySelector('a[href="/dashboard.html"][title="Switch deployment"]');
          if (existing) {
            existing.href = "/store/" + encodeURIComponent(d.slug) + "/login";
            existing.style.display = "inline-block";
          } else if (switchLink && !document.getElementById("viewStorefrontLink")) {
            const storefrontLink = document.createElement("a");
            storefrontLink.id = "viewStorefrontLink";
            storefrontLink.href = "/store/" + encodeURIComponent(d.slug) + "/login";
            storefrontLink.className = "top-nav-back";
            storefrontLink.title = "View customer storefront";
            storefrontLink.textContent = "Storefront";
            switchLink.parentNode.insertBefore(storefrontLink, switchLink);
          }
        }
      }
    })
    .catch(() => {});
  function adjustColor(hex, factor) {
    const m = hex.slice(1).match(/.{2}/g);
    if (!m) return hex;
    return "#" + m.map((x) => Math.min(255, Math.round(parseInt(x, 16) * factor)).toString(16).padStart(2, "0")).join("");
  }
  function lighten(hex, amount) {
    const m = hex.slice(1).match(/.{2}/g);
    if (!m) return hex;
    return "#" + m.map((x) => Math.min(255, Math.round(parseInt(x, 16) + (255 - parseInt(x, 16)) * amount)).toString(16).padStart(2, "0")).join("");
  }
})();
