/**
 * Mail service using Resend.
 * Sends notification emails from templates with placeholder replacement.
 * Requires RESEND_API_KEY and RESEND_FROM_EMAIL in env.
 *
 * Trigger mapping (template name → when it fires):
 * - ORDER_PLACED: when a customer places an order (customer.routes.js)
 * - ORDER_APPROVAL_NEEDED: when a POD order needs approval (customer.routes.js)
 * - ORDER_READY_FOR_PRINT: when an order is approved and ready for printing (approval.service.js)
 * - ORDER_APPROVED: when a shipping label is created (order.controller.js)
 * - ORDER_REJECTED: when an admin rejects a POD order (approval.service.js)
 * - ORDER_SHIPPED: when order status is changed to shipped (order.controller.js)
 *
 * Placeholders: {{name}}, {{email}}, {{orderId}}, {{total}}, {{trackingCode}}, {{shippingLabelUrl}}, {{approvalLink}}, {{orderLink}}, {{itemsList}}
 */

const { Resend } = require("resend");
const prisma = require("../lib/prisma");
const orderService = require("./order.service");

function getClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is required");
  return new Resend(apiKey);
}

/**
 * Replace placeholders like {{name}}, {{email}} in a string.
 * @param {string} str - Template string
 * @param {Object} data - Key-value pairs for replacement
 * @returns {string}
 */
function replacePlaceholders(str, data) {
  if (!str || typeof str !== "string") return str;
  let result = str;
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
    result = result.replace(placeholder, String(value ?? ""));
  }
  return result;
}

/**
 * Trigger a notification email for an order.
 * Looks up the order and NotificationTemplate, replaces placeholders, sends via Resend.
 * @param {number} orderId - Order ID
 * @param {string} templateName - e.g. 'ORDER_APPROVED', 'ORDER_PLACED'
 * @returns {Promise<{ success: boolean, messageId?: string }>}
 */
/**
 * Get recipient emails for a template.
 * - customer: order's customerEmail (the person who placed the order)
 * - admin_groups: admin users in the selected AdminGroups
 * - custom_emails: comma-separated emails from template.customEmails
 * @param {Object} template - NotificationTemplate with recipientGroups, customEmails
 * @param {Object} order - Order with deploymentId, customerEmail
 * @returns {Promise<string[]>} Unique email addresses to send to
 */
async function getRecipientEmails(template, order) {
  if (template.recipientType === "custom_emails" && template.customEmails) {
    const emails = template.customEmails
      .split(/[,\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e.includes("@"));
    return [...new Set(emails)];
  }
  if (template.recipientType === "admin_groups" && template.recipientGroups?.length) {
    const groupIds = template.recipientGroups
      .filter((r) => r.adminGroup?.deploymentId === order.deploymentId)
      .map((r) => r.adminGroupId)
      .filter(Boolean);
    if (groupIds.length === 0) return [];

    const members = await prisma.adminGroupMember.findMany({
      where: { adminGroupId: { in: groupIds } },
      include: { user: true },
    });
    const adminEmails = [...new Set(
      members
        .filter((m) => m.user?.email)
        .map((m) => m.user.email.toLowerCase().trim())
    )];
    return adminEmails;
  }
  // customer: send to the order's customer (the user who placed the order)
  return order.customerEmail ? [order.customerEmail.toLowerCase().trim()] : [];
}

async function triggerNotification(orderId, templateName) {
  const order = await orderService.findById(orderId, null);
  if (!order) throw new Error("Order not found");

  const template = await prisma.notificationTemplate.findUnique({
    where: { name: String(templateName).trim() },
    include: { recipientGroups: { include: { adminGroup: true } } },
  });
  if (!template) throw new Error(`Notification template "${templateName}" not found`);
  if (template.enabled === false) return { success: true, messageId: null, skipped: "disabled" };

  const recipients = await getRecipientEmails(template, order);
  if (recipients.length === 0) {
    return { success: true, messageId: null, skipped: "no recipients" };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const fromName = process.env.RESEND_FROM_NAME || "Inventory System";

  const baseUrl = (process.env.APP_URL || process.env.BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || "").replace(/\/$/, "");
  const baseFull = baseUrl ? (baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`) : "";
  // For admin_groups templates, link to storefront approval page; else backend
  let approvalLink = "";
  const orderLink = baseFull ? `${baseFull}/orders.html?order=${order.id}` : "";
  if (baseFull) {
    if (template.recipientType === "admin_groups") {
      const deploymentService = require("./deployment.service");
      const dep = await deploymentService.findById(order.deploymentId);
      const slug = dep?.slug || "";
      approvalLink = slug ? `${baseFull}/store/${encodeURIComponent(slug)}/approvals` : `${baseFull}/pending-approvals.html`;
    } else {
      approvalLink = `${baseFull}/pending-approvals.html`;
    }
  }

  const items = order.items || [];
  const itemsList = items
    .map((i) => `• ${i.quantity}× ${i.productName || "Item"}${i.printData ? " (POD)" : ""}`)
    .join("\n");
  const itemsListHtml = itemsList ? itemsList.replace(/\n/g, "<br>") : "(no items)";

  const data = {
    name: order.customerName,
    email: order.customerEmail,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    orderId: order.id,
    total: order.total,
    trackingCode: order.trackingCode || "",
    shippingLabelUrl: order.shippingLabelUrl || "",
    approvalLink,
    orderLink,
    itemsList: itemsList || "(no items)",
    itemsListHtml,
  };

  const subject = replacePlaceholders(template.subject, data);
  const body = replacePlaceholders(template.body, data);
  const html = body.replace(/\n/g, "<br>");

  let attachments = [];
  if (templateName === "ORDER_READY_FOR_PRINT" && items.length > 0) {
    const orderPrintPdfService = require("./orderPrintPdf.service");
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const pdfBuffer = await orderPrintPdfService.generatePrintPdfForItem(item);
      if (pdfBuffer && pdfBuffer.length > 0) {
        const safeName = (item.productName || "item").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
        attachments.push({
          filename: `order-${order.id}-proof-${idx + 1}-${safeName}.pdf`,
          content: pdfBuffer,
        });
      }
    }
  }

  const resend = getClient();
  const results = [];
  for (const to of recipients) {
    const sendOpts = {
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      html,
    };
    if (attachments.length > 0) {
      sendOpts.attachments = attachments;
    }
    const { data: result, error } = await resend.emails.send(sendOpts);
    if (error) throw new Error(`Resend error: ${error.message}`);
    results.push(result?.id);
  }
  return { success: true, messageId: results[0], messageIds: results };
}

/**
 * Send a password reset email.
 * @param {string} to - Email address
 * @param {string} resetLink - Full URL to the reset page with token
 * @param {string} [userName] - Optional display name
 * @returns {Promise<{ success: boolean, messageId?: string }>}
 */
async function sendPasswordResetEmail(to, resetLink, userName) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is required");

  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const fromName = process.env.RESEND_FROM_NAME || "Inventory System";
  const displayName = userName || to.split("@")[0];

  const html = `
    <p>Hi ${escapeHtml(displayName)},</p>
    <p>You requested a password reset. Click the link below to set a new password:</p>
    <p><a href="${escapeHtml(resetLink)}" style="color:#2563eb;text-decoration:underline">Reset password</a></p>
    <p>Or copy this link: ${escapeHtml(resetLink)}</p>
    <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    <p>— ${escapeHtml(fromName)}</p>
  `;

  const resend = getClient();
  const { data, error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: String(to).toLowerCase().trim(),
    subject: "Reset your password",
    html,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
  return { success: true, messageId: data?.id };
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  triggerNotification,
  replacePlaceholders,
  sendPasswordResetEmail,
};
