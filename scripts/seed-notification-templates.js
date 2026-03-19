#!/usr/bin/env node
/**
 * Seed default notification templates.
 * Run: node scripts/seed-notification-templates.js
 */

const prisma = require("../src/lib/prisma");

const TEMPLATES = [
  {
    name: "ORDER_APPROVED",
    subject: "Your order has been approved",
    body: "Hi {{name}},\n\nYour order #{{orderId}} has been approved and is on its way!\n\nTracking number: {{trackingCode}}\n\nThank you for your order.",
  },
  {
    name: "ORDER_PLACED",
    subject: "Order confirmation - #{{orderId}}",
    body: "Hi {{name}},\n\nThank you for your order. We've received your order #{{orderId}}.\n\nTotal: ${{total}}\n\nWe'll notify you when it ships.",
  },
  {
    name: "ORDER_REJECTED",
    subject: "Update on your order #{{orderId}}",
    body: "Hi {{name}},\n\nUnfortunately we were unable to approve your order #{{orderId}}. Please contact us if you have questions.",
  },
];

async function main() {
  for (const t of TEMPLATES) {
    await prisma.notificationTemplate.upsert({
      where: { name: t.name },
      create: t,
      update: { subject: t.subject, body: t.body },
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
