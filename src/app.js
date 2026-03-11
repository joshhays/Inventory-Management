const express = require("express");
const productRoutes = require("./routes/product.routes");
const {
  notFoundHandler,
  errorHandler,
} = require("./middleware/error.middleware");

const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.use("/api/products", productRoutes);
app.use("/api/user-groups", require("./routes/userGroup.routes"));
app.use("/api/logs", require("./routes/inventoryLog.routes"));
app.use("/api/orders", require("./routes/order.routes"));

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
