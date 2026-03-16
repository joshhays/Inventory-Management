/** Updates the nav logo and brand colors from the selected deployment. */
(function () {
  const logo = document.querySelector(".nav-logo-wrap .nav-logo, .nav-logo-wrap img");
  fetch("/api/deployments/selected", { credentials: "include" })
    .then((r) => r.json())
    .then((data) => {
      const d = data.deployment;
      if (d) {
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
