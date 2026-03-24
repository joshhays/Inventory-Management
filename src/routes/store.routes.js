const express = require("express");
const path = require("path");
const fs = require("fs");
const deploymentService = require("../services/deployment.service");
const { withPresignedLogo, withPresignedLogos } = require("../lib/deploymentUrls");

const router = express.Router();
const storeDir = path.resolve(__dirname, "../../public/store");
const STORE_PAGES = ["", "index", "products", "cart", "orders", "settings", "login", "register", "fill", "approvals"];

const DEFAULT_LOGO_SVG = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSIzNiIgdmlld0JveD0iMCAwIDgwIDM2Ij48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iMzYiIGZpbGw9IiNmMWY1ZjkiIHJ4PSI2Ii8+PHRleHQgeD0iNDAiIHk9IjIyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjQ3NDhiIiBmb250LXNpemU9IjEyIiBmb250LWZhbWlseT0ic3lzdGVtLXVpLHNhbnMtc2VyaWYiPlN0b3JlPC90ZXh0Pjwvc3ZnPg==";

function applyBrandColors(hex, factor) {
  const m = (hex || "").slice(1).match(/.{2}/g);
  if (!m) return hex || "#0f172a";
  return "#" + m.map((x) => Math.min(255, Math.round(parseInt(x, 16) * factor)).toString(16).padStart(2, "0")).join("");
}
function lighten(hex, amount) {
  const m = (hex || "").slice(1).match(/.{2}/g);
  if (!m) return hex || "#f8fafc";
  return "#" + m.map((x) => Math.min(255, Math.round(parseInt(x, 16) + (255 - parseInt(x, 16)) * amount)).toString(16).padStart(2, "0")).join("");
}

function serveStorePage(slug, page, dep, res, next) {
  const file = page === "" || page === "index" ? "index.html" : `${page}.html`;
  const filePath = path.join(storeDir, file);
  if (!fs.existsSync(filePath)) return next();
  const base = `/store/${encodeURIComponent(slug)}`;
  const logoUrl = dep?.logoUrl || DEFAULT_LOGO_SVG;
  const storeName = dep?.name || slug || "Store";
  const c1 = dep?.brandColor1 || null;
  const c2 = dep?.brandColor2 || null;
  const brandCss = [];
  if (c1) brandCss.push(`--sidebar-bg:${c1};--nav-brand-bg:${c1};`);
  if (c2) {
    const c2Light = lighten(c2, 0.15);
    const c2Dark = applyBrandColors(c2, 0.92);
    brandCss.push(`--page-bg:linear-gradient(135deg,${c2Light} 0%,${c2} 50%,${c2Dark} 100%);`);
  }
  fs.readFile(filePath, "utf8", (err, html) => {
    if (err) return next(err);
    let out = html
      .replace(/__STORE_BASE__/g, base)
      .replace(/__STORE_SLUG__/g, slug)
      .replace(/__STORE_LOGO__/g, logoUrl)
      .replace(/__STORE_NAME__/g, storeName);
    if (brandCss.length) {
      out = out.replace("</head>", `<style id="store-brand">:root{${brandCss.join(" ")}}</style>\n</head>`);
    }
    res.type("text/html").send(out);
  });
}

// /store and /store/ - combined so /store/ is handled before /store/:slug can match
router.get(["/store", "/store/"], async (req, res, next) => {
  if (req.path !== "/store/") return res.redirect(302, "/store/");
  try {
    let deployments = await deploymentService.findAll();
    deployments = await withPresignedLogos(deployments);
    function escapeHtml(s) {
      return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    const cards = deployments.map((d) => `
        <a href="/store/${encodeURIComponent(d.slug)}/" class="bento-card">
          <div class="bento-card-visual">
            ${d.logoUrl ? `<img src="${escapeHtml(d.logoUrl)}" alt="" class="bento-card-logo">` : `<div class="bento-card-placeholder">${escapeHtml((d.name || "?")[0])}</div>`}
          </div>
          <div class="bento-card-content">
            <span class="bento-card-name">${escapeHtml(d.name || d.slug)}</span>
            <span class="bento-card-slug">${escapeHtml(d.slug)}</span>
          </div>
        </a>
        `).join("");
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Store - Select</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div class="dashboard-page">
    <header class="dashboard-header">
      <h1>Store</h1>
      <p class="dashboard-subtitle">Choose a storefront to shop</p>
    </header>
    <main class="dashboard-main">
      <div class="bento-grid" id="storeList">
        ${cards}
      </div>
      ${deployments.length === 0 ? '<p class="dashboard-empty">No storefronts available.</p>' : ""}
    </main>
  </div>
  <style>
    .bento-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; max-width: 800px; margin: 0 auto; }
    .bento-card { display: flex; flex-direction: column; align-items: center; padding: 1.5rem; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius); text-decoration: none; color: inherit; transition: border-color 0.2s, box-shadow 0.2s; }
    .bento-card:hover { border-color: var(--accent); box-shadow: var(--card-shadow-hover); }
    .bento-card-visual { width: 80px; height: 48px; display: flex; align-items: center; justify-content: center; margin-bottom: 0.75rem; }
    .bento-card-logo { max-width: 100%; max-height: 100%; object-fit: contain; }
    .bento-card-placeholder { width: 48px; height: 48px; background: rgba(71,85,105,0.12); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; color: var(--accent); }
    .bento-card-name { font-weight: 600; }
    .bento-card-slug { font-size: 0.85rem; color: var(--text-muted); }
  </style>
</body>
</html>`;
    res.type("text/html").send(html);
  } catch (e) {
    console.error("[store] Error loading store selector:", e);
    next(e);
  }
});

// /store/:slug (no trailing slash) - redirect to /store/:slug/
// Must skip when path already has trailing slash to avoid redirect loop (Express matches both)
router.get("/store/:slug", async (req, res, next) => {
  if (req.path.endsWith("/")) return next();
  const { slug } = req.params;
  if (!slug || slug.trim() === "") return next();
  try {
    const dep = await deploymentService.findBySlug(slug);
    if (!dep) return res.status(404).send("Store not found");
    return res.redirect(302, `/store/${encodeURIComponent(slug)}/`);
  } catch (e) {
    next(e);
  }
});

// /store/:slug/ - serve store index (must come before /store/:slug/:page)
router.get("/store/:slug/", async (req, res, next) => {
  const { slug } = req.params;
  try {
    let dep = await deploymentService.findBySlug(slug);
    if (!dep) return res.status(404).send("Store not found");
    dep = await withPresignedLogo(dep);
    serveStorePage(slug, "index", dep, res, next);
  } catch (e) {
    next(e);
  }
});

// /store/:slug/:page - serve store pages (login, products, cart, etc.)
router.get("/store/:slug/:page", async (req, res, next) => {
  const { slug, page } = req.params;
  const pageBase = page.replace(/\.html$/, "");
  if (!STORE_PAGES.includes(pageBase)) return next();
  try {
    let dep = await deploymentService.findBySlug(slug);
    if (!dep) return res.status(404).send("Store not found");
    dep = await withPresignedLogo(dep);
    serveStorePage(slug, pageBase, dep, res, next);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
