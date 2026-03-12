/**
 * Redirect unauthenticated users to the login page when they request protected HTML pages.
 * Must run after session middleware, before express.static.
 */
const PROTECTED_PATHS = ["/", "/index.html", "/products.html", "/products-manage.html", "/orders.html", "/logs.html", "/users.html", "/groups.html"];

function requirePageAuth(req, res, next) {
  if (req.method !== "GET") return next();

  const path = req.path === "" ? "/" : req.path;
  const isProtected = PROTECTED_PATHS.includes(path);

  if (!isProtected) return next();
  if (req.session?.user) return next();

  return res.redirect(302, "/login.html");
}

module.exports = { requirePageAuth };
