/**
 * Email service - sends notifications when orders are ready for pickup.
 * Uses SMTP (not IMAP - IMAP is for receiving email).
 *
 * Required .env variables:
 *   SMTP_HOST       - e.g. smtp.gmail.com, smtp.office365.com
 *   SMTP_PORT       - usually 587 (TLS) or 465 (SSL)
 *   SMTP_USER       - your email address
 *   SMTP_PASS       - password or app password
 *   EMAIL_FROM      - sender address (can be same as SMTP_USER)
 *   EMAIL_READY_TO  - recipient when order is ready (messenger pickup contact)
 */

const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = env.smtpHost;
  const port = env.smtpPort;
  const user = env.smtpUser;
  const pass = env.smtpPass;
  if (!host || !user || !pass) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host,
    port: port || 587,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

function isEmailConfigured() {
  return !!(env.smtpHost && env.smtpUser && env.smtpPass && env.emailReadyTo);
}

/**
 * Send email when an order is ready for messenger pickup.
 * @param {Object} order - Order with id, customerName, total, shippingAddress, etc.
 * @returns {Promise<boolean>} - true if sent, false if skipped (not configured)
 */
async function sendOrderReadyEmail(order) {
  const to = env.emailReadyTo;
  const from = env.emailFrom || env.smtpUser;
  if (!to || !from) return false;

  const transport = getTransporter();
  if (!transport) return false;

  const orderId = order?.id ?? "?";
  const customerName = order?.customerName ?? "Customer";
  const total = order?.total != null ? Number(order.total).toFixed(2) : "—";

  let shippingText = "No shipping address provided.";
  if (order?.shippingAddress) {
    try {
      const parsed = JSON.parse(order.shippingAddress);
      if (parsed && typeof parsed === "object") {
        const lines = [];
        if (parsed.name) lines.push(parsed.name);
        if (parsed.company) lines.push(parsed.company);
        if (parsed.address1) lines.push(parsed.address1);
        if (parsed.address2) lines.push(parsed.address2);
        if (parsed.city || parsed.state || parsed.zip) {
          lines.push([parsed.city, parsed.state, parsed.zip].filter(Boolean).join(", "));
        }
        shippingText = lines.join("\n") || shippingText;
      } else {
        shippingText = order.shippingAddress;
      }
    } catch {
      shippingText = order.shippingAddress;
    }
  }

  const html = `
    <p>Order <strong>#${orderId}</strong> is ready for pickup.</p>
    <p><strong>Customer:</strong> ${customerName}</p>
    <p><strong>Total:</strong> $${total}</p>
    <p><strong>Shipping address:</strong></p>
    <pre style="margin:0;font-family:sans-serif;white-space:pre-wrap">${shippingText}</pre>
    <p>Please set messenger pickup.</p>
  `;

  try {
    await transport.sendMail({
      from,
      to,
      subject: `Order #${orderId} ready – please set messenger pickup`,
      text: `Order #${orderId} is ready for pickup. Customer: ${customerName}. Total: $${total}. Please set messenger pickup.`,
      html,
    });
    return true;
  } catch (err) {
    console.error("[email] Failed to send order-ready notification:", err.message);
    return false;
  }
}

module.exports = {
  sendOrderReadyEmail,
  isEmailConfigured,
};
