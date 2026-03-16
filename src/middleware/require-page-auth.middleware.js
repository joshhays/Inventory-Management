/**
 * Redirect unauthenticated users to the login page when they request protected HTML pages.
 * Must run after session middleware, before express.static.
 */
const ADMIN_PATHS = ["/", "/index.html", "/products.html", "/products-manage.html", "/orders.html", "/logs.html", "/users.html", "/groups.html", "/reports.html", "/report-view.html", "/deployments.html"];
const ADMIN_PATHS_REQUIRE_DEPLOYMENT = ["/", "/index.html", "/products.html", "/products-manage.html", "/orders.html", "/logs.html", "/users.html", "/groups.html", "/reports.html", "/report-view.html"];
const DEPLOYMENT_SELECT_PATH = "/dashboard.html";
const STORE_PATHS = ["/store/", "/store/index.html", "/store/products.html", "/store/cart.html", "/store/orders.html"];

function requirePageAuth(req, res, next) {
  if (req.method !== "GET") return next();

  const path = req.path === "" ? "/" : req.path;
  const isAdminPath = ADMIN_PATHS.includes(path) || path === DEPLOYMENT_SELECT_PATH;
  const isStorePath =
    (path === "/store" || path.startsWith("/store/")) &&
    path !== "/store/login.html" &&
    path !== "/store/register.html";

  if (!isAdminPath && !isStorePath) return next();
  if (req.session?.user) {
    if (path !== DEPLOYMENT_SELECT_PATH && ADMIN_PATHS_REQUIRE_DEPLOYMENT.includes(path)) {
      if (!req.session?.selectedDeploymentId) {
        return res.redirect(302, DEPLOYMENT_SELECT_PATH);
      }
    }
    return next();
  }

  if (isStorePath) return res.redirect(302, "/store/login.html");
  return res.redirect(302, "/login.html");
}

module.exports = { requirePageAuth };
