const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,
  sessionSecret: process.env.SESSION_SECRET || "change-me-in-production",
};
