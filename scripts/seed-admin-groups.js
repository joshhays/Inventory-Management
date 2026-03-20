#!/usr/bin/env node
/**
 * Seed sample admin groups and admin access config.
 * Run: node scripts/seed-admin-groups.js
 * Run: npm run seed:admin-groups
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const prisma = require("../src/lib/prisma");

const SAMPLE_GROUPS = [
  "Order Access",
  "Email Notifications",
  "Inventory Admin",
  "Yorke Admin",
  "Yorke Admin Users Access",
];

const SAMPLE_ACCESS_CONFIG = [
  { category: "Order Management", pages: ["Orders", "Approval Queue", "Prep Queue", "Production Queue", "Shipping Queue"], viewModifyGroupIds: [], viewOnlyGroupIds: [] },
  { category: "Downloads", pages: ["Downloads"], viewModifyGroupIds: [], viewOnlyGroupIds: [] },
  { category: "Finance", pages: ["Finance", "Ledger"], viewModifyGroupIds: [], viewOnlyGroupIds: [] },
  { category: "Logs", pages: ["Logs"], viewModifyGroupIds: [], viewOnlyGroupIds: [] },
  { category: "User Accounts Management", pages: ["User Accounts", "User Groups", "User Access", "Profile Fields", "Approvals", "Address Books"], viewModifyGroupIds: [], viewOnlyGroupIds: [] },
  { category: "Content Production", pages: ["Projects", "Categories", "Products", "Asset Manager", "Global Library", "Metadata Fields"], viewModifyGroupIds: [], viewOnlyGroupIds: [] },
  { category: "Purchasing", pages: ["Checkout", "Price Tables", "Tax Rates"], viewModifyGroupIds: [], viewOnlyGroupIds: [] },
  { category: "Admin Accounts Management", pages: ["Admin Accounts", "Admin Groups", "Admin Access"], viewModifyGroupIds: [], viewOnlyGroupIds: [] },
  { category: "Notifications", pages: ["Notifications", "Themes", "Site Options"], viewModifyGroupIds: [], viewOnlyGroupIds: [] },
];

async function main() {
  // Get first deployment
  let deployment = await prisma.deployment.findFirst({ orderBy: { id: "asc" } });
  if (!deployment) {
    deployment = await prisma.deployment.create({
      data: { name: "Default", slug: "default" },
    });
    console.log("Created deployment: Default");
  }

  const deploymentId = deployment.id;
  const createdGroups = [];

  for (const name of SAMPLE_GROUPS) {
    const existing = await prisma.adminGroup.findFirst({
      where: { deploymentId, name },
    });
    if (existing) {
      console.log(`Admin group "${name}" already exists`);
      createdGroups.push(existing);
    } else {
      const g = await prisma.adminGroup.create({
        data: {
          deploymentId,
          name,
          permissions: "{}",
          canApproveOrders: name === "Order Access",
          canManageInventory: /inventory|admin/i.test(name),
          canEditUsers: /user|yorke/i.test(name),
        },
      });
      console.log(`Created admin group: ${name}`);
      createdGroups.push(g);
    }
  }

  // Assign Order Access to Order Management, Yorke Admin to Finance/Content/Admin, etc.
  const orderAccess = createdGroups.find((g) => g.name === "Order Access");
  const yorkeAdmin = createdGroups.find((g) => g.name === "Yorke Admin");
  const yorkeUsers = createdGroups.find((g) => g.name === "Yorke Admin Users Access");

  const configWithGroups = SAMPLE_ACCESS_CONFIG.map((row) => {
    const r = { ...row };
    if (row.category === "Order Management" && orderAccess) {
      r.viewModifyGroupIds = [orderAccess.id];
      r.viewOnlyGroupIds = [orderAccess.id];
    }
    if (["Finance", "Content Production", "Purchasing", "Admin Accounts Management"].includes(row.category) && yorkeAdmin) {
      r.viewModifyGroupIds = [yorkeAdmin.id];
      r.viewOnlyGroupIds = [yorkeAdmin.id];
    }
    if (row.category === "User Accounts Management" && yorkeUsers) {
      r.viewModifyGroupIds = [yorkeUsers.id];
      r.viewOnlyGroupIds = [yorkeUsers.id];
    }
    if (row.category === "Notifications" && createdGroups.find((g) => g.name === "Email Notifications")) {
      const emailGrp = createdGroups.find((g) => g.name === "Email Notifications");
      if (emailGrp) {
        r.viewModifyGroupIds = [emailGrp.id];
        r.viewOnlyGroupIds = [emailGrp.id];
      }
    }
    return r;
  });

  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { adminAccessConfig: JSON.stringify(configWithGroups) },
  });
  console.log("Updated admin access config with sample group assignments");

  // Add first admin user to Order Access if exists
  const adminUser = await prisma.user.findFirst({
    where: { isAdmin: true },
  });
  if (adminUser && orderAccess) {
    try {
      await prisma.adminGroupMember.upsert({
        where: {
          userId_adminGroupId: { userId: adminUser.id, adminGroupId: orderAccess.id },
        },
        create: { userId: adminUser.id, adminGroupId: orderAccess.id },
        update: {},
      });
      console.log(`Added admin user ${adminUser.email} to Order Access`);
    } catch (e) {
      // Ignore if already exists
    }
  }

  // Link groups to notification templates
  const emailGroup = createdGroups.find((g) => g.name === "Email Notifications");
  const orderAccess = createdGroups.find((g) => g.name === "Order Access");
  const approvalTemplate = await prisma.notificationTemplate.findFirst({
    where: { name: "ORDER_APPROVAL_NEEDED" },
  });
  const readyTemplate = await prisma.notificationTemplate.findFirst({
    where: { name: "ORDER_READY_FOR_PRINT" },
  });
  if (emailGroup && approvalTemplate) {
    try {
      await prisma.notificationTemplateRecipient.upsert({
        where: {
          templateId_adminGroupId: { templateId: approvalTemplate.id, adminGroupId: emailGroup.id },
        },
        create: { templateId: approvalTemplate.id, adminGroupId: emailGroup.id },
        update: {},
      });
      console.log("Linked Email Notifications to ORDER_APPROVAL_NEEDED template");
    } catch (e) {
      // May need to update template recipientType - ignore
    }
  }
  if (orderAccess && readyTemplate) {
    try {
      await prisma.notificationTemplateRecipient.upsert({
        where: {
          templateId_adminGroupId: { templateId: readyTemplate.id, adminGroupId: orderAccess.id },
        },
        create: { templateId: readyTemplate.id, adminGroupId: orderAccess.id },
        update: {},
      });
      console.log("Linked Order Access to ORDER_READY_FOR_PRINT template");
    } catch (e) {
      // Ignore
    }
  }

  console.log("Done. Visit /admin to see Admin Groups and Admin Access.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
