const express = require("express");
const session = require("express-session");
const path = require("path");

const env = require("./config/env");
const productRoutes = require("./routes/product.routes");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const { notFoundHandler, errorHandler } = require("./middleware/error.middleware");
const { requireAuth, requireAdmin } = require("./middleware/auth.middleware");
const { requirePageAuth } = require("./middleware/require-page-auth.middleware");

const app = express();

app.use(express.json());
app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);
app.use(requirePageAuth);
app.use(express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);

app.use("/api/users", requireAuth, requireAdmin, userRoutes);

app.use("/api/products", requireAuth, productRoutes);
app.use("/api/user-groups", requireAuth, require("./routes/userGroup.routes"));
app.use("/api/logs", requireAuth, requireAdmin, require("./routes/inventoryLog.routes"));
app.use("/api/orders", requireAuth, requireAdmin, require("./routes/order.routes"));

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
