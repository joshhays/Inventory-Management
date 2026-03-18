/**
 * Redirect unauthenticated users to the login page when they request protected HTML pages.
 * Must run after session middleware, before express.static.
 */
const ADMIN_PATHS = ["/", "/index.html", "/products.html", "/products-manage.html", "/orders.html", "/pending-approvals.html", "/logs.html", "/users.html", "/groups.html", "/reports.html", "/report-view.html", "/deployments.html", "/categories.html", "/shipping.html", "/discounts.html"];
const ADMIN_PATHS_REQUIRE_DEPLOYMENT = ["/", "/index.html", "/products.html", "/products-manage.html", "/orders.html", "/pending-approvals.html", "/logs.html", "/users.html", "/groups.html", "/reports.html", "/report-view.html", "/categories.html", "/shipping.html", "/discounts.html"];
const DEPLOYMENT_SELECT_PATH = "/dashboard.html";

// Store paths that require auth (orders, settings). Index, products, cart, login, register are public.
const STORE_AUTH_REQUIRED = /^\/store\/[^/]+\/(orders|settings)(\/)?$/;

function requirePageAuth(req, res, next) {
  if (req.method !== "GET") return next();

  const path = req.path === "" ? "/" : req.path;
  const pathNoQuery = path.replace(/\?.*$/, "");
  const isAdminPath = ADMIN_PATHS.includes(path) || path === DEPLOYMENT_SELECT_PATH;
  const isStoreAuthRequired =
    (path === "/store" || path.startsWith("/store/")) &&
    path !== "/store" &&
    path !== "/store/" &&
    STORE_AUTH_REQUIRED.test(pathNoQuery);

  if (!isAdminPath && !isStoreAuthRequired) return next();
  if (req.session?.user) {
    if (path !== DEPLOYMENT_SELECT_PATH && ADMIN_PATHS_REQUIRE_DEPLOYMENT.includes(path)) {
      if (!req.session?.selectedDeploymentId) {
        return res.redirect(302, DEPLOYMENT_SELECT_PATH);
      }
    }
    return next();
  }

  if (isStoreAuthRequired) {
    const slugMatch = path.match(/^\/store\/([^/]+)/);
    const loginPath = slugMatch ? `/store/${slugMatch[1]}/login` : "/store/login.html";
    return res.redirect(302, loginPath);
  }
  return res.redirect(302, "/login.html");
}

module.exports = { requirePageAuth };
