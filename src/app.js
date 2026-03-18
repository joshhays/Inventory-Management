const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const path = require("path");

const env = require("./config/env");
const productRoutes = require("./routes/product.routes");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const podRoutes = require("./routes/pod.routes");
const { notFoundHandler, errorHandler } = require("./middleware/error.middleware");
const { requireAuth, requireAdmin, optionalAuth, requireDeployment } = require("./middleware/auth.middleware");
const { requirePageAuth } = require("./middleware/require-page-auth.middleware");
const storeRoutes = require("./routes/store.routes");

const app = express();

app.set("trust proxy", 1);

const isProd = process.env.NODE_ENV === "production";
let sessionDir = path.join(__dirname, "../prisma");
const dbUrl = process.env.DATABASE_URL || "";
if (dbUrl.startsWith("file:")) {
  const dbPath = dbUrl.replace("file:", "").trim();
  const resolved = path.resolve(process.cwd(), dbPath);
  sessionDir = path.dirname(resolved);
}
const sessionStore = new SQLiteStore({
  db: "sessions.db",
  dir: sessionDir,
});

app.use(express.json());
app.use(
  session({
    store: sessionStore,
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProd,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  })
);
app.use(requirePageAuth);
app.use(storeRoutes);
app.use(express.static(path.join(__dirname, "../public")));
const adminUiPath = path.join(__dirname, "../admin-ui/dist/admin");
app.use("/admin", express.static(adminUiPath));
app.get(/^\/admin(\/.*)?$/, (req, res, next) => {
  res.sendFile(path.join(adminUiPath, "index.html"), (err) => (err ? next(err) : null));
});
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/product-files", express.static(path.join(__dirname, "../product-files")));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);

app.use("/api/users", requireAuth, requireAdmin, userRoutes);

app.use("/api/products", optionalAuth, require("./middleware/deployment.middleware").setDeploymentContext, productRoutes);
app.use("/api/pod", podRoutes);
app.use("/api/product-files", requireAuth, requireDeployment, require("./routes/productFile.routes"));
app.use("/api/user-groups", requireAuth, requireDeployment, require("./routes/userGroup.routes"));
app.use("/api/logs", requireAuth, requireAdmin, requireDeployment, require("./routes/inventoryLog.routes"));
app.use("/api/orders", requireAuth, requireAdmin, requireDeployment, require("./routes/order.routes"));
app.use("/api/reports", requireAuth, requireAdmin, requireDeployment, require("./routes/report.routes"));
app.use("/api/dashboard-widgets", requireAuth, requireAdmin, requireDeployment, require("./routes/dashboardWidget.routes"));
app.use("/api/deployments/:id/categories", requireAuth, require("./routes/deploymentCategory.routes"));
app.use("/api/deployments/:id/shipping-tiers", requireAuth, require("./routes/shippingTier.routes"));
app.use("/api/deployments/:id/discount-rules", requireAuth, require("./routes/discountRule.routes"));
app.use("/api/deployments", requireAuth, require("./routes/deployment.routes"));
app.use("/api/customer", requireAuth, require("./routes/customer.routes"));
app.use("/api/shipping", require("./routes/shipping.routes"));
app.use("/api/discount", require("./routes/discount.routes"));
app.use("/api/admin", require("./middleware/deployment.middleware").setDeploymentContext, require("./routes/admin.routes"));
app.use("/api/notification-templates", requireAuth, requireAdmin, require("./routes/notificationTemplate.routes"));

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
