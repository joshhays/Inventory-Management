#!/usr/bin/env node
/**
 * Seed default notification templates.
 * Run: node scripts/seed-notification-templates.js
 */

const prisma = require("../src/lib/prisma");

const TEMPLATES = [
  {
    name: "ORDER_APPROVED",
    displayName: "Order approved",
    subject: "Your order has been approved",
    body: "Hi {{name}},\n\nYour order #{{orderId}} has been approved and is on its way!\n\nTracking number: {{trackingCode}}\n\nThank you for your order.",
  },
  {
    name: "ORDER_PLACED",
    displayName: "Order confirmation",
    subject: "Order confirmation - #{{orderId}}",
    body: "Hi {{name}},\n\nThank you for your order. We've received your order #{{orderId}}.\n\n{{rushCustomerNote}}Total: ${{total}}\n\nWe'll notify you when it ships.",
  },
  {
    name: "ORDER_REJECTED",
    displayName: "Order rejected",
    subject: "Update on your order #{{orderId}}",
    body: "Hi {{name}},\n\nUnfortunately we were unable to approve your order #{{orderId}}. Please contact us if you have questions.",
  },
  {
    name: "ORDER_APPROVAL_NEEDED",
    displayName: "Order approval needed",
    subject: "Order #{{orderId}} needs your approval",
    body: "Hi,\n\n{{rushNote}}A new order #{{orderId}} from {{customerName}} needs your approval.\n\n<a href=\"{{approvalLink}}\">Review and approve</a>\n\nTotal: ${{total}}",
    recipientType: "admin_groups",
  },
  {
    name: "ORDER_READY_FOR_PRINT",
    displayName: "Order ready for printing",
    subject: "Order #{{orderId}} approved — ready for printing",
    body: "Hi,\n\n{{rushNote}}Order #{{orderId}} from {{customerName}} has been approved and is ready for printing.\n\nItems:\n{{itemsList}}\n\nTotal: ${{total}}\n\nProof PDFs are attached to this email.\n\n<a href=\"{{orderLink}}\">View order details</a>\n\nPlease start the print job when ready.",
    recipientType: "admin_groups",
  },
  {
    name: "ORDER_SHIPPED",
    displayName: "Order shipped",
    subject: "Your order #{{orderId}} has shipped",
    body: "Hi {{name}},\n\nYour order #{{orderId}} has shipped!\n\nTracking number: {{trackingCode}}\n\nThank you for your order.",
  },
];

async function main() {
  for (const t of TEMPLATES) {
    await prisma.notificationTemplate.upsert({
      where: { name: t.name },
      create: {
        name: t.name,
        displayName: t.displayName || null,
        subject: t.subject,
        body: t.body,
        recipientType: t.recipientType || "customer",
      },
      update: {
        displayName: t.displayName || null,
        subject: t.subject,
        body: t.body,
        recipientType: t.recipientType || "customer",
      },
    });
    console.log(`Upserted template: ${t.name}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
