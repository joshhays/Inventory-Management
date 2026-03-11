/**
 * SPA-style tab navigation: fetch pages without full reload so tabs flow smoothly
 * and previously loaded data can be cached by the browser.
 */
(function () {
  const ROUTES = {
    "/": "/",
    "/index.html": "/",
    "/products-manage.html": "/products-manage.html",
    "/orders.html": "/orders.html",
    "/logs.html": "/logs.html",
  };

  function getPath(href) {
    try {
      const path = new URL(href, location.origin).pathname;
      return path === "" ? "/" : path;
    } catch {
      return href;
    }
  }

  function isSamePage(href) {
    const path = getPath(href);
    const current = getPath(location.href);
    return path === current || (path === "/" && current === "/index.html");
  }

  function showLoading() {
    let el = document.getElementById("nav-loading");
    if (!el) {
      el = document.createElement("div");
      el.id = "nav-loading";
      el.className = "nav-loading-overlay";
      el.innerHTML = '<div class="nav-loading-spinner"></div>';
      document.body.appendChild(el);
    }
    el.classList.add("active");
  }

  function hideLoading() {
    const el = document.getElementById("nav-loading");
    if (el) el.classList.remove("active");
  }

  async function navigate(href) {
    if (isSamePage(href)) return;
    const path = getPath(href);
    showLoading();
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(res.statusText);
      const html = await res.text();
      document.open();
      document.write(html);
      document.close();
    } catch (e) {
      hideLoading();
      location.href = href;
    }
  }

  function init() {
    document.addEventListener("click", (e) => {
      const a = e.target.closest(".top-nav-tabs a[href]");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("//")) return;
      e.preventDefault();
      navigate(href);
    });

    window.addEventListener("popstate", () => {
      const path = location.pathname || "/";
      if (!isSamePage(path)) navigate(path);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
