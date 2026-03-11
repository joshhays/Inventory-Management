function canAccessProduct(user, product) {
  if (!user) return false;
  if (user.isAdmin) return true;
  if (product.groupId == null) return true;
  return (user.groupIds || []).includes(product.groupId);
}

module.exports = { canAccessProduct };
