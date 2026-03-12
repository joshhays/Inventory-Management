/**
 * Debug endpoint for email configuration.
 * GET /api/email/debug - returns config status (no secrets)
 * GET /api/email/debug?send=1 - sends a test email to EMAIL_READY_TO
 */
const express = require("express");
const env = require("../config/env");
const emailService = require("../services/email.service");

const router = express.Router();

router.get("/debug", (req, res) => {
  const sendTest = req.query.send === "1" || req.query.send === "true";

  const status = {
    configured: emailService.isEmailConfigured(),
    smtpHost: env.smtpHost ? "✓ set" : "✗ missing",
    smtpPort: env.smtpPort || 587,
    smtpUser: env.smtpUser ? "✓ set" : "✗ missing",
    smtpPass: env.smtpPass ? "✓ set" : "✗ missing",
    emailFrom: env.emailFrom || env.smtpUser || "—",
    emailReadyTo: env.emailReadyTo || "—",
  };

  if (!sendTest) {
    return res.json({ ok: true, email: status });
  }

  if (!emailService.isEmailConfigured()) {
    return res.status(400).json({
      ok: false,
      message: "Email not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_READY_TO in Railway Variables.",
      email: status,
    });
  }

  const testOrder = {
    id: "TEST",
    customerName: "Test Customer",
    total: 0,
    shippingAddress: JSON.stringify({ name: "Test", address1: "123 Test St", city: "Test City", state: "TX", zip: "12345" }),
  };

  emailService
    .sendOrderReadyEmail(testOrder)
    .then((sent) => {
      res.json({
        ok: true,
        testSent: sent,
        message: sent ? "Test email sent to " + env.emailReadyTo : "Failed to send (check Railway logs)",
        email: status,
      });
    })
    .catch((err) => {
      console.error("[email] Debug test failed:", err);
      res.status(500).json({
        ok: false,
        message: err.message || "SMTP error – check SMTP_HOST (use smtp.office365.com for Microsoft 365)",
        email: status,
      });
    });
});

module.exports = router;
