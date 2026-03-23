/**
 * Bento dashboard items - source of truth for dashboard cards and Admin Access categories.
 * Each item maps to a dashboard bento box. Admin Access controls view vs modify per admin group.
 */
const BENTO_ITEMS = [
  { id: "admin", href: "/admin", icon: "⚙️", title: "Admin", desc: "Approvals, templates, admin groups, admin access", large: true },
  { id: "products", href: "/products.html", icon: "📦", title: "Products", desc: "View inventory, adjust quantities, scan barcodes", large: false },
  { id: "products-manage", href: "/products-manage.html", icon: "✏️", title: "Manage Products", desc: "Create, edit, and organize products", large: false },
  { id: "orders", href: "/orders.html", icon: "🛒", title: "Orders", desc: "View and manage orders", large: false },
  { id: "pending-approvals", href: "/pending-approvals.html", icon: "✓", title: "Pending Approvals", desc: "Approve POD orders and create shipping labels", large: false },
  { id: "templates", href: "/templates.html", icon: "✉️", title: "Notification Templates", desc: "Email settings – user, reviewer, and admin notifications", large: false },
  { id: "logs", href: "/logs.html", icon: "📋", title: "Transaction Log", desc: "Audit trail of inventory changes", large: false },
  { id: "users", href: "/users.html", icon: "👥", title: "Users", desc: "Manage accounts, permissions, and groups", large: false },
  { id: "admin-groups", href: "/admin/groups", icon: "👔", title: "Admin Groups", desc: "Dashboard permissions and template recipients", large: false },
  { id: "groups", href: "/groups.html", icon: "🏷️", title: "User/Admin Groups", desc: "User groups for storefront, admin groups for dashboard", large: false },
  { id: "deployments", href: "/deployments.html", icon: "🏢", title: "Deployments", desc: "Manage companies – add and switch between deployments", large: false },
  { id: "categories", href: "/categories.html", icon: "📂", title: "Store Categories", desc: "Add categories for the storefront – tag products to sort them", large: false },
  { id: "shipping", href: "/shipping.html", icon: "🚚", title: "Shipping Tiers", desc: "Box sizes and weights by item count – 250 cards, 500 cards, etc.", large: false },
  { id: "reports", href: "/reports.html", icon: "📊", title: "Reports", desc: "AI-powered reports – ask anything", large: false },
];

function getDefaultAccessConfig() {
  return BENTO_ITEMS.map((item) => ({
    bentoId: item.id,
    category: item.title,
    pages: [item.desc],
    viewModifyGroupIds: [],
    viewOnlyGroupIds: [],
  }));
}

function getBentoItem(id) {
  return BENTO_ITEMS.find((b) => b.id === id);
}

/**
 * Maps legacy/Pageflex category names to bento IDs so Admin Access config works
 * when using seeded categories (e.g. "Order Management") vs bento ids ("orders").
 */
const CATEGORY_TO_BENTO_IDS = {
  "Order Management": ["orders", "pending-approvals"],
  "Admin Accounts Management": ["admin", "admin-groups"],
  "Content Production": ["products", "products-manage", "categories"],
  "User Accounts Management": ["users", "groups"],
  Logs: ["logs"],
  Notifications: ["templates"],
  Finance: ["reports"],
  Purchasing: ["shipping"],
  Downloads: [],
};

function getBentoIdsForConfigRow(row) {
  const id = row.bentoId || BENTO_ITEMS.find((b) => b.title === row.category || b.id === row.category)?.id;
  if (id && BENTO_ITEMS.some((b) => b.id === id)) {
    return [id];
  }
  const mapped = CATEGORY_TO_BENTO_IDS[row.category];
  if (mapped && mapped.length > 0) return mapped;
  if (id) return [id];
  return [];
}

module.exports = {
  BENTO_ITEMS,
  getDefaultAccessConfig,
  getBentoItem,
  getBentoIdsForConfigRow,
};
