const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,
  sessionSecret: process.env.SESSION_SECRET || "change-me-in-production",

  // SMTP for sending "order ready" emails (not IMAP - that's for receiving)
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  emailFrom: process.env.EMAIL_FROM || process.env.SMTP_USER,
  emailReadyTo: process.env.EMAIL_READY_TO,
};
