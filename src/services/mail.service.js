/**
 * Mail service using Resend.
 * Sends notification emails from templates with placeholder replacement.
 * Requires RESEND_API_KEY and RESEND_FROM_EMAIL in env.
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
async function triggerNotification(orderId, templateName) {
  const order = await orderService.findById(orderId, null);
  if (!order) throw new Error("Order not found");

  const template = await prisma.notificationTemplate.findUnique({
    where: { name: String(templateName).trim() },
  });
  if (!template) throw new Error(`Notification template "${templateName}" not found`);

  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const fromName = process.env.RESEND_FROM_NAME || "Inventory System";

  const data = {
    name: order.customerName,
    email: order.customerEmail,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    orderId: order.id,
    total: order.total,
    trackingCode: order.trackingCode || "",
    shippingLabelUrl: order.shippingLabelUrl || "",
  };

  const subject = replacePlaceholders(template.subject, data);
  const body = replacePlaceholders(template.body, data);

  const resend = getClient();
  const { data: result, error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: order.customerEmail,
    subject,
    html: body.replace(/\n/g, "<br>"),
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
  return { success: true, messageId: result?.id };
}

module.exports = {
  triggerNotification,
  replacePlaceholders,
};
